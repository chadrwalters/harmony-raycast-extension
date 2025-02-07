import { Logger } from "../logging/logger";
import { EventEmitter } from "events";

const MAX_RECONNECTS = 3;
const RECONNECT_DELAY = 1000;
const CONNECTION_TIMEOUT = 5000;

interface QueuedMessage {
  id: string;
  data: any;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timestamp: number;
}

/**
 * WebSocket client for Harmony Hub communication.
 * Handles real-time communication with the Harmony Hub using WebSocket protocol.
 */
export class HarmonyWebSocket extends EventEmitter {
  protected ws: WebSocket | null = null;
  private messageQueue: QueuedMessage[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly url: string;
  private messageTimeout = 5000; // 5 seconds timeout for messages
  private logger: Logger;
  private connectPromise: Promise<void> | null = null;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((error: Error) => void) | null = null;

  /**
   * Creates a new HarmonyWebSocket instance.
   *
   * @param url - WebSocket URL
   */
  constructor(url: string) {
    super();
    this.logger = new Logger();
    this.url = url;
    this.logger.info("HarmonyWebSocket constructor called with URL:", url);
    this.connect();
  }

  /**
   * Creates a new HarmonyWebSocket instance.
   *
   * @param url - WebSocket URL
   * @returns HarmonyWebSocket instance
   */
  static createInstance(url: string): HarmonyWebSocket {
    console.log("Creating new HarmonyWebSocket instance with URL:", url);
    return new HarmonyWebSocket(url);
  }

  /**
   * Sends a message to the Harmony Hub.
   *
   * @param data - Message to send
   * @returns void
   * @throws {Error} If send fails
   *
   * @example
   * ```typescript
   * webSocket.send(JSON.stringify({ command: "PowerOn" }));
   * ```
   */
  public send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    this.logger.debug("Sending data:", data);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.logger.warn("Attempted to send data but WebSocket is not open");
      this.messageQueue.push({
        id: this.generateMessageId(),
        data,
        resolve: () => {},
        reject: () => {},
        timestamp: Date.now()
      });
    }
  }

  /**
   * Closes the WebSocket connection.
   *
   * @param code - Close code
   * @param reason - Close reason
   * @returns void
   *
   * @example
   * ```typescript
   * webSocket.close();
   * ```
   */
  public close(code?: number, reason?: string): void {
    this.logger.info("Closing WebSocket connection");
    if (this.ws) {
      this.ws.close(code, reason);
    }
  }

  /**
   * Establishes a new WebSocket connection to the Harmony Hub.
   *
   * @returns Promise<void>
   * @throws {Error} If connection fails
   */
  private connect(): Promise<void> {
    this.logger.info("Starting WebSocket connection to:", this.url);
    
    // Create new connection promise if none exists
    if (!this.connectPromise) {
      this.connectPromise = new Promise((resolve, reject) => {
        this.connectResolve = resolve;
        this.connectReject = reject;
      });
    }
    
    try {
      this.logger.debug("Creating new WebSocket instance");
      this.ws = new WebSocket(this.url);
      this.logger.debug("WebSocket instance created, setting up listeners");
      this.setupListeners();
      
      // Set connection timeout
      setTimeout(() => {
        if (!this.isConnected && this.connectReject) {
          this.logger.error("WebSocket connection timeout");
          const error = new Error("Connection timeout");
          this.connectReject(error);
          this.handleError(error);
        }
      }, CONNECTION_TIMEOUT);

      this.logger.debug("Connection attempt initiated");
    } catch (error) {
      this.logger.error("Failed to create WebSocket:", error);
      if (this.connectReject) {
        this.connectReject(error as Error);
      }
      this.handleError(error as Error);
    }

    return this.connectPromise;
  }

  /**
   * Sets up event listeners for the WebSocket connection.
   */
  private setupListeners() {
    if (!this.ws) return;

    this.ws.onopen = (event) => {
      this.logger.info("WebSocket connected");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      if (this.connectResolve) {
        this.connectResolve();
      }
      this.emit('open', event);
      this.processQueue();
    };

    this.ws.onclose = (event) => {
      this.logger.info("WebSocket closed");
      this.isConnected = false;
      this.emit('close', event);
      this.handleClose();
    };

    this.ws.onerror = (event) => {
      const error = new Error("WebSocket error");
      this.logger.error("WebSocket error:", event);
      if (this.connectReject) {
        this.connectReject(error);
      }
      this.emit('error', event);
      this.handleError(error);
    };

    this.ws.onmessage = (event) => {
      this.emit('message', event);
      this.handleMessage(event);
    };
  }

  /**
   * Handles WebSocket close event.
   */
  private handleClose() {
    this.isConnected = false;
    if (this.reconnectAttempts < MAX_RECONNECTS) {
      this.logger.info(`Attempting reconnect ${this.reconnectAttempts + 1}/${MAX_RECONNECTS}`);
      this.reconnectAttempts++;
      // Reset connection promise for next attempt
      this.connectPromise = null;
      this.connectResolve = null;
      this.connectReject = null;
      setTimeout(() => this.connect(), RECONNECT_DELAY);
    } else {
      this.logger.error("Max reconnection attempts reached");
      const error = new Error("Max reconnection attempts reached");
      if (this.connectReject) {
        this.connectReject(error);
      }
      this.emit('error', error);
    }
  }

  /**
   * Handles WebSocket errors.
   *
   * @param error - WebSocket error
   */
  private handleError(error: Error): void {
    this.logger.error("WebSocket error:", error);
    this.emit('error', error);
  }

  /**
   * Handles incoming WebSocket messages.
   *
   * @param event - Message event
   */
  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data);
      this.logger.debug("Received message:", message);
      
      // Find and resolve the corresponding queued message
      if (message.id) {
        const index = this.messageQueue.findIndex(m => m.id === message.id);
        if (index !== -1) {
          const { resolve } = this.messageQueue[index];
          this.messageQueue.splice(index, 1);
          resolve(message);
        }
      }
      
      this.emit('message', message);
    } catch (error) {
      this.logger.error("Failed to parse message:", error);
      this.emit('error', error);
    }
  }

  /**
   * Generates a unique message ID.
   *
   * @returns string Message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Processes the message queue.
   */
  private processQueue() {
    const now = Date.now();
    
    // Process all messages in the queue
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue[0];
      
      // Check for timeout
      if (now - message.timestamp > this.messageTimeout) {
        this.messageQueue.shift();
        message.reject(new Error("Message timeout"));
        continue;
      }
      
      // Send message if connected
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        try {
          const messageWithId = { ...message.data, id: message.id };
          this.ws.send(JSON.stringify(messageWithId));
          this.logger.debug("Sent message:", messageWithId);
        } catch (error) {
          message.reject(error);
        }
        this.messageQueue.shift();
      } else {
        // Stop processing if we're not connected
        break;
      }
    }
    
    // Schedule next queue processing if there are remaining messages
    if (this.messageQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Waits for the WebSocket connection to be established.
   *
   * @param timeout - Timeout in milliseconds
   * @returns Promise<void>
   * @throws {Error} If connection fails
   */
  public async waitForConnection(timeout = CONNECTION_TIMEOUT): Promise<void> {
    if (this.isConnected) return;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, timeout);

      this.once('open', () => {
        clearTimeout(timer);
        resolve();
      });

      this.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Disconnects from the Harmony Hub.
   */
  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.messageQueue = [];
  }

  /**
   * Checks if the WebSocket connection is currently open.
   *
   * @returns boolean True if connected
   */
  public isOpen(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Gets the current WebSocket ready state.
   *
   * @returns WebSocket.ReadyState
   */
  public get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * Adds an event listener to the WebSocket connection.
   *
   * @param event - Event type
   * @param listener - Event listener function
   */
  public addEventListener(event: string, listener: EventListener): void {
    if (this.ws) {
      this.ws.addEventListener(event, listener);
    }
  }

  /**
   * Removes an event listener from the WebSocket connection.
   *
   * @param event - Event type
   * @param listener - Event listener function
   */
  public removeEventListener(event: string, listener: EventListener): void {
    if (this.ws) {
      this.ws.removeEventListener(event, listener);
    }
  }
}
