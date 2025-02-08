import { HarmonyCommand, CommandRequest, CommandStatus, CommandResult, CommandQueueConfig } from "../../features/control/types/harmony";
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

interface ExecutionContext {
  attempts: number;
  maxRetries: number;
  timeout: number;
  startTime: number;
  lastError?: Error;
}

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
    this.validateQueueCapacity();
    const result = this.createInitialResult(request);
    await this.processQueue();
    return result;
  }

  /**
   * Process the command queue
   */
  private async processQueue(): Promise<void> {
    if (!this.canProcessMore()) return;

    const request = this.queue.shift();
    if (!request) return;

    this.executing.add(request);
    const result = this.updateResultStatus(request.command.id, CommandStatus.EXECUTING);
    if (!result) return;

    try {
      await this.executeCommand(request);
      this.handleCommandSuccess(request, result);
    } catch (error) {
      this.handleCommandFailure(request, result, error);
    } finally {
      this.finishCommandExecution(request);
    }
  }

  /**
   * Execute a single command with retries and timeout
   */
  private async executeCommand(request: CommandRequest): Promise<void> {
    const context = this.createExecutionContext(request);
    
    while (context.attempts <= context.maxRetries) {
      try {
        await this.executeWithTimeout(request, context);
        return;
      } catch (error) {
        await this.handleExecutionError(request, context, error);
      }
    }
  }

  /**
   * Execute a command with timeout
   */
  private async executeWithTimeout(
    request: CommandRequest,
    context: ExecutionContext
  ): Promise<void> {
    this.logExecutionAttempt(request, context);

    await Promise.race([
      this.sendCommand(request.command),
      this.createTimeoutPromise(context.timeout)
    ]);
  }

  /**
   * Handle execution error and determine if retry is needed
   */
  private async handleExecutionError(
    request: CommandRequest,
    context: ExecutionContext,
    error: unknown
  ): Promise<void> {
    context.attempts++;
    context.lastError = error instanceof Error ? error : new Error(String(error));

    if (context.attempts > context.maxRetries) {
      throw this.createDetailedError(request, context);
    }

    this.logRetryAttempt(request, context);
    await this.delay(this.config.commandDelay);
  }

  /**
   * Create a detailed error with execution context
   */
  private createDetailedError(
    request: CommandRequest,
    context: ExecutionContext
  ): HarmonyError {
    return new HarmonyError(
      `Command failed after ${context.attempts} attempts`,
      ErrorCategory.COMMAND,
      context.lastError,
      {
        command: request.command,
        deviceId: request.command.deviceId,
        attempts: context.attempts,
        maxRetries: context.maxRetries,
        executionTime: Date.now() - context.startTime,
        lastError: context.lastError?.message
      }
    );
  }

  // Helper methods
  private validateQueueCapacity(): void {
    if (this.queue.length >= (this.config.maxQueueSize ?? DEFAULT_CONFIG.maxQueueSize)) {
      throw new HarmonyError(
        "Command queue is full",
        ErrorCategory.QUEUE,
        undefined,
        {
          queueSize: this.queue.length,
          maxSize: this.config.maxQueueSize,
          executing: this.executing.size
        }
      );
    }
  }

  private createInitialResult(request: CommandRequest): CommandResult {
    const result: CommandResult = {
      command: request.command,
      status: CommandStatus.QUEUED,
      queuedAt: Date.now()
    };

    this.results.set(request.command.id, result);
    this.queue.push(request);
    return result;
  }

  private canProcessMore(): boolean {
    return this.queue.length > 0 && 
           this.executing.size < (this.config.maxConcurrent ?? DEFAULT_CONFIG.maxConcurrent);
  }

  private updateResultStatus(commandId: string, status: CommandStatus): CommandResult | undefined {
    const result = this.results.get(commandId);
    if (result) {
      result.status = status;
      result.startedAt = Date.now();
    }
    return result;
  }

  private handleCommandSuccess(request: CommandRequest, result: CommandResult): void {
    result.status = CommandStatus.COMPLETED;
    request.onComplete?.();
  }

  private handleCommandFailure(request: CommandRequest, result: CommandResult, error: unknown): void {
    result.status = CommandStatus.FAILED;
    result.error = error instanceof Error ? error : new Error(String(error));
    request.onError?.(result.error);
  }

  private finishCommandExecution(request: CommandRequest): void {
    const result = this.results.get(request.command.id);
    if (result) {
      result.completedAt = Date.now();
    }
    this.executing.delete(request);
    this.processQueue();
  }

  private createExecutionContext(request: CommandRequest): ExecutionContext {
    return {
      attempts: 0,
      maxRetries: request.retries ?? this.config.defaultRetries,
      timeout: request.timeout ?? this.config.defaultTimeout,
      startTime: Date.now()
    };
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new HarmonyError(
        "Command execution timed out",
        ErrorCategory.COMMAND,
        undefined,
        { timeout }
      )), timeout)
    );
  }

  private logExecutionAttempt(request: CommandRequest, context: ExecutionContext): void {
    Logger.debug(`Executing command (Attempt ${context.attempts + 1}/${context.maxRetries + 1})`, {
      command: request.command.name,
      deviceId: request.command.deviceId,
      attempts: context.attempts,
      maxRetries: context.maxRetries,
      executionTime: Date.now() - context.startTime
    });
  }

  private logRetryAttempt(request: CommandRequest, context: ExecutionContext): void {
    Logger.warn(`Command failed, retrying (${context.attempts}/${context.maxRetries})`, {
      command: request.command,
      error: context.lastError,
      attempts: context.attempts,
      maxRetries: context.maxRetries,
      executionTime: Date.now() - context.startTime
    });
  }

  private async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private async sendCommand(command: HarmonyCommand): Promise<void> {
    await this.commandSender(command);
  }

  // Public utility methods
  public getResult(commandId: string): CommandResult | undefined {
    return this.results.get(commandId);
  }

  public clearCompleted(): void {
    for (const [id, result] of this.results.entries()) {
      if (this.isCommandFinished(result.status)) {
        this.results.delete(id);
      }
    }
  }

  private isCommandFinished(status: CommandStatus): boolean {
    return [
      CommandStatus.COMPLETED,
      CommandStatus.FAILED,
      CommandStatus.CANCELLED
    ].includes(status);
  }

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
