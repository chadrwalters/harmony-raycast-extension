import WebSocket from "ws";
import { EventEmitter } from "events";
import { HarmonyHub, HarmonyDevice, HarmonyActivity } from "../../features/control/types/harmony";
import { Logger } from "../logger";
import { HarmonyError, ErrorCategory } from "../../types/errors";
import {
  WebSocketMessageType,
  WebSocketMessage,
  WebSocketMessageUnion,
  WebSocketResponse,
  WebSocketConnectionStatus,
  WebSocketEventHandler,
  WebSocketErrorHandler,
  ActivitiesResponse,
  DevicesResponse,
} from "../../types/websocket";

// Constants for WebSocket management
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 1000;
const CONNECTION_TIMEOUT = 5000;
const PING_INTERVAL = 30000;
const MESSAGE_TIMEOUT = 5000;

interface QueuedMessage {
  id: string;
  type: WebSocketMessageType;
  payload: any;
  resolve: (value: WebSocketResponse<unknown>) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * WebSocket client for communicating with Harmony Hub.
 * Handles connection management, message queuing, and event handling.
 */
export class HarmonyWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private messageQueue: QueuedMessage[] = [];
  private status: WebSocketConnectionStatus = WebSocketConnectionStatus.DISCONNECTED;
  private eventHandler?: WebSocketEventHandler;
  private errorHandler?: WebSocketErrorHandler;
  private reconnectAttempts = 0;
  private pingInterval: NodeJS.Timer | null = null;
  private messageTimeouts: Map<string, NodeJS.Timer> = new Map();
  private connectPromise: Promise<void> | null = null;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((error: Error) => void) | null = null;

  private currentActivity: string | null = null;
  private currentState: {
    activities: HarmonyActivity[];
    devices: HarmonyDevice[];
  } = {
    activities: [],
    devices: []
  };

  constructor(private readonly hub: HarmonyHub) {
    super();
    Logger.debug("HarmonyWebSocket constructor called for hub:", hub.name);
  }

  /**
   * Get current connection status
   */
  getStatus(): WebSocketConnectionStatus {
    return this.status;
  }

  /**
   * Connect to the Harmony Hub
   */
  async connect(): Promise<void> {
    if (this.ws) {
      Logger.debug("WebSocket already exists, cleaning up...");
      this.cleanup();
    }

    if (this.connectPromise) {
      Logger.debug("Connection already in progress, returning existing promise");
      return this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;

      try {
        Logger.debug(`Creating WebSocket connection to ${this.hub.ip}`);
        this.status = WebSocketConnectionStatus.CONNECTING;
        this.ws = new WebSocket(`ws://${this.hub.ip}`);

        // Set up connection timeout
        const timeout = setTimeout(() => {
          if (this.status === WebSocketConnectionStatus.CONNECTING) {
            const error = new HarmonyError(
              "WebSocket connection timeout",
              ErrorCategory.WEBSOCKET
            );
            this.handleError(error);
          }
        }, CONNECTION_TIMEOUT);

        this.ws.on("open", () => {
          Logger.debug("WebSocket connection opened");
          clearTimeout(timeout);
          this.status = WebSocketConnectionStatus.CONNECTED;
          this.reconnectAttempts = 0;
          this.startPingInterval();
          this.processMessageQueue();
          if (this.connectResolve) this.connectResolve();
        });

        this.ws.on("close", () => {
          Logger.debug("WebSocket connection closed");
          this.handleClose();
        });

        this.ws.on("error", (error: Error) => {
          Logger.error("WebSocket error:", error);
          clearTimeout(timeout);
          this.handleError(new HarmonyError(
            "WebSocket error",
            ErrorCategory.WEBSOCKET,
            error
          ));
        });

        this.ws.on("message", (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

      } catch (error) {
        Logger.error("Failed to create WebSocket:", error);
        this.handleError(new HarmonyError(
          "Failed to create WebSocket",
          ErrorCategory.WEBSOCKET,
          error instanceof Error ? error : undefined
        ));
      }
    });

    return this.connectPromise;
  }

  /**
   * Start the ping interval to keep connection alive
   */
  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, PING_INTERVAL);
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(): void {
    this.cleanup();

    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      Logger.debug(`Attempting to reconnect (${this.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect().catch(Logger.error);
      }, RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts));
    } else {
      const error = new HarmonyError(
        "Maximum reconnection attempts reached",
        ErrorCategory.WEBSOCKET
      );
      this.handleError(error);
    }
  }

  /**
   * Clean up WebSocket resources
   */
  private cleanup(): void {
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Clear all message timeouts
    this.messageTimeouts.forEach(clearTimeout);
    this.messageTimeouts.clear();

    this.status = WebSocketConnectionStatus.DISCONNECTED;
    this.connectPromise = null;
    this.connectResolve = null;
    this.connectReject = null;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      Logger.debug("Received WebSocket message:", message);

      // Clear message timeout if it exists
      if (message.id && this.messageTimeouts.has(message.id)) {
        clearTimeout(this.messageTimeouts.get(message.id)!);
        this.messageTimeouts.delete(message.id);
      }

      // Process message and resolve queue
      if (message.id) {
        const queueIndex = this.messageQueue.findIndex(m => m.id === message.id);
        if (queueIndex !== -1) {
          const { resolve } = this.messageQueue[queueIndex];
          this.messageQueue.splice(queueIndex, 1);
          resolve(message);
        }
      }

      // Handle events
      if (message.type === "event" && this.eventHandler) {
        this.eventHandler(message);
      }

    } catch (error) {
      Logger.error("Failed to handle WebSocket message:", error);
      this.handleError(new HarmonyError(
        "Failed to handle WebSocket message",
        ErrorCategory.WEBSOCKET,
        error instanceof Error ? error : undefined
      ));
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(error: HarmonyError): void {
    Logger.error("WebSocket error:", error);
    
    if (this.connectReject) {
      this.connectReject(error);
      this.connectPromise = null;
      this.connectResolve = null;
      this.connectReject = null;
    }

    if (this.errorHandler) {
      this.errorHandler(error);
    }

    this.emit("error", error);
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue[0];
      
      try {
        this.ws.send(JSON.stringify({
          id: message.id,
          type: message.type,
          payload: message.payload
        }));

        // Set message timeout
        this.messageTimeouts.set(message.id, setTimeout(() => {
          const error = new HarmonyError(
            `Message timeout: ${message.type}`,
            ErrorCategory.WEBSOCKET
          );
          message.reject(error);
          this.messageTimeouts.delete(message.id);
          this.messageQueue.shift();
        }, MESSAGE_TIMEOUT));

      } catch (error) {
        Logger.error("Failed to send WebSocket message:", error);
        message.reject(new HarmonyError(
          "Failed to send WebSocket message",
          ErrorCategory.WEBSOCKET,
          error instanceof Error ? error : undefined
        ));
        this.messageQueue.shift();
      }
    }
  }

  /**
   * Send a message through the WebSocket
   */
  async send<T>(type: WebSocketMessageType, payload: any): Promise<WebSocketResponse<T>> {
    return new Promise((resolve, reject) => {
      const message: QueuedMessage = {
        id: Math.random().toString(36).substring(7),
        type,
        payload,
        resolve,
        reject,
        timestamp: Date.now()
      };

      this.messageQueue.push(message);

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.processMessageQueue();
      } else {
        this.connect().catch(reject);
      }
    });
  }

  /**
   * Set event handler
   */
  setEventHandler(handler: WebSocketEventHandler): void {
    this.eventHandler = handler;
  }

  /**
   * Set error handler
   */
  setErrorHandler(handler: WebSocketErrorHandler): void {
    this.errorHandler = handler;
  }

  /**
   * Close the WebSocket connection
   */
  async close(): Promise<void> {
    Logger.debug("Closing WebSocket connection...");
    this.cleanup();
  }

  /**
   * Get activities from the Harmony Hub
   */
  async getActivities(): Promise<HarmonyActivity[]> {
    const response = await this.send<HarmonyActivity[]>(WebSocketMessageType.GET_ACTIVITIES, {});
    return (response as ActivitiesResponse).data || [];
  }

  /**
   * Get devices from the Harmony Hub
   */
  async getDevices(): Promise<HarmonyDevice[]> {
    const response = await this.send<HarmonyDevice[]>(WebSocketMessageType.GET_DEVICES, {});
    return (response as DevicesResponse).data || [];
  }

  /**
   * Execute a command on a device
   */
  public async executeCommand(deviceId: string, command: string): Promise<void> {
    if (!this.ws || this.status !== WebSocketConnectionStatus.CONNECTED) {
      throw new HarmonyError(
        "WebSocket is not connected",
        ErrorCategory.WEBSOCKET
      );
    }

    try {
      Logger.debug("Executing command", { deviceId, command });
      await this.send(WebSocketMessageType.EXECUTE_COMMAND, {
        deviceId,
        command
      });
      Logger.info("Command executed successfully", { deviceId, command });
    } catch (error) {
      const commandError = new HarmonyError(
        "Failed to execute command",
        ErrorCategory.HARMONY,
        error instanceof Error ? error : undefined
      );
      Logger.error("Command execution failed", commandError);
      throw commandError;
    }
  }

  /**
   * Get current hub state
   */
  public async getCurrentState(): Promise<{ activities: HarmonyActivity[]; devices: HarmonyDevice[]; currentActivity: string | null }> {
    try {
      // Refresh state if needed
      if (this.currentState.activities.length === 0) {
        this.currentState.activities = await this.getActivities();
      }
      if (this.currentState.devices.length === 0) {
        this.currentState.devices = await this.getDevices();
      }

      return {
        ...this.currentState,
        currentActivity: this.currentActivity
      };
    } catch (error) {
      const stateError = new HarmonyError(
        "Failed to get current state",
        ErrorCategory.HARMONY,
        error instanceof Error ? error : undefined
      );
      Logger.error("State retrieval failed", stateError);
      throw stateError;
    }
  }

  /**
   * Update the current activity state
   */
  private updateCurrentActivity(activityId: string | null): void {
    this.currentActivity = activityId;
    Logger.debug("Current activity updated", { activityId });
  }

  /**
   * Start an activity on the Harmony Hub
   */
  public async startActivity(activityId: string): Promise<void> {
    try {
      await this.send(WebSocketMessageType.START_ACTIVITY, {
        activityId
      });
      this.updateCurrentActivity(activityId);
      Logger.info("Activity started successfully", { activityId });
    } catch (error) {
      const activityError = new HarmonyError(
        "Failed to start activity",
        ErrorCategory.HARMONY,
        error instanceof Error ? error : undefined
      );
      Logger.error("Activity start failed", activityError);
      throw activityError;
    }
  }

  /**
   * Stop the current activity on the Harmony Hub
   */
  public async stopActivity(): Promise<void> {
    try {
      await this.send(WebSocketMessageType.STOP_ACTIVITY, {});
      this.updateCurrentActivity(null);
      Logger.info("Activity stopped successfully");
    } catch (error) {
      const activityError = new HarmonyError(
        "Failed to stop activity",
        ErrorCategory.HARMONY,
        error instanceof Error ? error : undefined
      );
      Logger.error("Activity stop failed", activityError);
      throw activityError;
    }
  }
}
