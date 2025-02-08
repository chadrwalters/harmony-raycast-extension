import { HarmonyCommand, CommandRequest, CommandStatus, CommandResult, CommandQueueConfig } from "../../types/harmony";
import { HarmonyError, ErrorCategory } from "../../types/errors";
import { Logger } from "../logger";

const DEFAULT_CONFIG: CommandQueueConfig = {
  maxQueueSize: 100,
  maxConcurrent: 1,
  defaultTimeout: 5000,
  defaultRetries: 2,
  commandDelay: 100
};

export type CommandSender = (command: HarmonyCommand) => Promise<void>;

/**
 * Manages command execution queue for Harmony Hub
 */
export class CommandQueue {
  private queue: CommandRequest[] = [];
  private executing: Set<CommandRequest> = new Set();
  private results: Map<string, CommandResult> = new Map();
  private config: CommandQueueConfig;
  private commandSender: CommandSender;

  constructor(
    commandSender: CommandSender,
    config?: Partial<CommandQueueConfig>
  ) {
    this.commandSender = commandSender;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a command to the queue
   */
  public async enqueue(request: CommandRequest): Promise<CommandResult> {
    if (this.queue.length >= (this.config.maxQueueSize ?? DEFAULT_CONFIG.maxQueueSize)) {
      throw new HarmonyError(
        "Command queue is full",
        ErrorCategory.QUEUE
      );
    }

    const result: CommandResult = {
      command: request.command,
      status: CommandStatus.QUEUED,
      queuedAt: Date.now()
    };

    this.results.set(request.command.id, result);
    this.queue.push(request);
    this.processQueue();

    return result;
  }

  /**
   * Process the command queue
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0 || 
        this.executing.size >= (this.config.maxConcurrent ?? DEFAULT_CONFIG.maxConcurrent)) {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.executing.add(request);
    const result = this.results.get(request.command.id);
    if (!result) return;

    result.status = CommandStatus.EXECUTING;
    result.startedAt = Date.now();

    try {
      await this.executeCommand(request);
      result.status = CommandStatus.COMPLETED;
      request.onComplete?.();
    } catch (error) {
      result.status = CommandStatus.FAILED;
      result.error = error instanceof Error ? error : new Error(String(error));
      request.onError?.(result.error);
    } finally {
      result.completedAt = Date.now();
      this.executing.delete(request);
      this.processQueue();
    }
  }

  /**
   * Execute a single command
   */
  private async executeCommand(request: CommandRequest): Promise<void> {
    const timeout = request.timeout ?? this.config.defaultTimeout;
    const maxRetries = request.retries ?? this.config.defaultRetries;
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        Logger.debug(`Executing command (Attempt ${attempts + 1}/${maxRetries + 1})`, {
          command: request.command.name,
          deviceId: request.command.deviceId
        });

        await Promise.race([
          this.sendCommand(request.command),
          new Promise((_, reject) => 
            setTimeout(() => reject(new HarmonyError(
              "Command execution timed out",
              ErrorCategory.COMMAND
            )), timeout)
          )
        ]);
        return;
      } catch (error) {
        attempts++;
        if (attempts > maxRetries) {
          throw new HarmonyError(
            `Command failed after ${attempts} attempts`,
            ErrorCategory.COMMAND,
            error instanceof Error ? error : undefined
          );
        }
        Logger.warn(`Command failed, retrying (${attempts}/${maxRetries})`, {
          command: request.command,
          error
        });
        await new Promise(resolve => 
          setTimeout(resolve, this.config.commandDelay)
        );
      }
    }
  }

  /**
   * Send command to the hub
   */
  private async sendCommand(command: HarmonyCommand): Promise<void> {
    await this.commandSender(command);
  }

  /**
   * Get the result of a command
   */
  public getResult(commandId: string): CommandResult | undefined {
    return this.results.get(commandId);
  }

  /**
   * Clear completed commands from results
   */
  public clearCompleted(): void {
    for (const [id, result] of this.results.entries()) {
      if (result.status === CommandStatus.COMPLETED || 
          result.status === CommandStatus.FAILED ||
          result.status === CommandStatus.CANCELLED) {
        this.results.delete(id);
      }
    }
  }

  /**
   * Cancel all pending commands
   */
  public cancelAll(): void {
    this.queue.forEach(request => {
      const result = this.results.get(request.command.id);
      if (result) {
        result.status = CommandStatus.CANCELLED;
        result.completedAt = Date.now();
      }
    });
    this.queue = [];
  }

  /**
   * Get current queue status
   */
  public getStatus(): {
    queueLength: number;
    executing: number;
    completed: number;
    failed: number;
  } {
    let completed = 0;
    let failed = 0;

    for (const result of this.results.values()) {
      if (result.status === CommandStatus.COMPLETED) completed++;
      if (result.status === CommandStatus.FAILED) failed++;
    }

    return {
      queueLength: this.queue.length,
      executing: this.executing.size,
      completed,
      failed
    };
  }
}
