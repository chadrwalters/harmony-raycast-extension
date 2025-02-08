import { showToast, Toast, LocalStorage } from "@raycast/api";
import { Explorer } from "@harmonyhub/discover";
import { Logger } from "../logger";
import { HarmonyHub, HarmonyStage, HarmonyDevice, HarmonyActivity, HarmonyState, LoadingState, HarmonyCommand } from "../../types/harmony";
import { HarmonyError, ErrorCategory } from "../../types/errors";
import { HarmonyClient } from "./harmonyClient";

// Constants
const DISCOVERY_TIMEOUT = 30000; // 30 seconds
const GRACE_PERIOD = 10000; // 10 seconds after first hub found
const MAX_DISCOVERY_RETRIES = 3;
const DISCOVERY_RETRY_DELAY = 1000; // 1 second between retries
const CACHE_KEY = "harmony_hub_data";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

type StateUpdateCallback = (state: HarmonyState) => void;
type LoadingUpdateCallback = (loading: LoadingState) => void;

/**
 * Manages Harmony Hub discovery and high-level operations
 */
export class HarmonyManager {
  private static instance: HarmonyManager;
  private subscribers: Set<StateUpdateCallback> = new Set();
  private client: HarmonyClient | null = null;
  private explorer: Explorer | null = null;
  private discoveryTimeout: NodeJS.Timeout | null = null;
  private discoveryLock: Promise<HarmonyHub[]> | null = null;
  private isDiscovering = false;
  private initialized = false;
  private state: HarmonyState = {
    hubs: [],
    selectedHub: null,
    devices: [],
    activities: [],
    currentActivity: null,
    error: null,
    loadingState: {
      stage: HarmonyStage.DISCOVERING,
      progress: 0,
      message: "Initializing..."
    }
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): HarmonyManager {
    if (!HarmonyManager.instance) {
      HarmonyManager.instance = new HarmonyManager();
    }
    return HarmonyManager.instance;
  }

  /**
   * Subscribe to state updates
   */
  public subscribe(callback: StateUpdateCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Update state and notify subscribers
   */
  private setState(newState: Partial<HarmonyState>): void {
    this.state = { ...this.state, ...newState };
    this.subscribers.forEach(callback => callback(this.state));
  }

  /**
   * Handle hub found event
   */
  private handleHubFound(hub: any): void {
    Logger.debug("Hub found event:", JSON.stringify(hub, null, 2));
    Logger.debug("Processing hub found event:", {
      uuid: hub.uuid,
      friendlyName: hub.friendlyName,
      ip: hub.ip,
      version: hub.hubVersion,
      productId: hub.productId,
      fullHubInfo: hub.fullHubInfo
    });

    const existingHub = this.state.hubs.find(h => h.id === hub.uuid);
    if (!existingHub) {
      Logger.info(`Found new Harmony Hub: ${hub.friendlyName} (${hub.ip})`);
      showToast({
        style: Toast.Style.Success,
        title: "Found new Harmony Hub",
        message: `${hub.friendlyName} (${hub.ip})`
      });

      const newHub: HarmonyHub = {
        id: hub.uuid,
        name: hub.friendlyName,
        ip: hub.ip,
        remoteId: hub.fullHubInfo?.remoteId,
        hubId: hub.fullHubInfo?.hubId,
        version: hub.fullHubInfo?.current_fw_version,
        port: hub.fullHubInfo?.port,
        productId: hub.fullHubInfo?.productId,
        protocolVersion: hub.fullHubInfo?.protocolVersion
      };

      Logger.debug("Created new hub object:", newHub);
      
      // Update state with new hub
      const updatedHubs = [...this.state.hubs, newHub];
      this.setState({
        hubs: updatedHubs,
        loadingState: {
          ...this.state.loadingState,
          progress: 0.5,
          message: `Found ${updatedHubs.length} Harmony Hub${updatedHubs.length === 1 ? '' : 's'}`
        }
      });

      // Cache the hub data
      this.cacheHubData(newHub);
    }
  }

  /**
   * Cache hub data
   */
  private async cacheHubData(hub: HarmonyHub): Promise<void> {
    try {
      const cachedData = await LocalStorage.getItem<string>(CACHE_KEY);
      const data = cachedData ? JSON.parse(cachedData) : { hubs: [] };
      
      // Update or add hub
      const index = data.hubs.findIndex((h: HarmonyHub) => h.id === hub.id);
      if (index >= 0) {
        data.hubs[index] = hub;
      } else {
        data.hubs.push(hub);
      }
      
      await LocalStorage.setItem(CACHE_KEY, JSON.stringify(data));
      Logger.debug("Cached hub data:", data);
    } catch (error) {
      Logger.error("Failed to cache hub data:", error);
    }
  }

  /**
   * Load cached hub data
   */
  private async loadCachedHubData(): Promise<void> {
    try {
      const cachedData = await LocalStorage.getItem<string>(CACHE_KEY);
      if (!cachedData) {
        return;
      }

      const data = JSON.parse(cachedData);
      if (data.hubs?.length > 0) {
        this.setState({
          hubs: data.hubs,
          loadingState: {
            stage: HarmonyStage.DISCOVERING,
            progress: 0.25,
            message: "Loaded cached hubs"
          }
        });
      }
    } catch (error) {
      Logger.error("Failed to load cached hub data:", error);
    }
  }

  /**
   * Discover Harmony Hubs
   */
  public async discoverHubs(): Promise<HarmonyHub[]> {
    if (this.isDiscovering) {
      Logger.info("Discovery already in progress");
      return this.state.hubs;
    }

    if (this.discoveryLock) {
      Logger.info("Waiting for existing discovery to complete");
      return this.discoveryLock;
    }

    this.isDiscovering = true;
    this.setState({
      loadingState: {
        stage: HarmonyStage.DISCOVERING,
        progress: 0,
        message: "Starting hub discovery..."
      }
    });

    // Load cached data first
    await this.loadCachedHubData();

    this.discoveryLock = new Promise((resolve, reject) => {
      try {
        Logger.info("Starting hub discovery");
        this.explorer = new Explorer();

        this.explorer.on("online", this.handleHubFound.bind(this));
        this.explorer.on("error", (error: Error) => {
          Logger.error("Discovery error:", error);
        });

        // Start discovery
        this.explorer.start();
        Logger.info("Discovery process started");

        // Set timeout
        this.discoveryTimeout = setTimeout(async () => {
          Logger.info("Discovery timeout reached");
          await this.cleanupDiscovery();
          
          if (this.state.hubs.length === 0) {
            const error = new HarmonyError("No Harmony Hubs found", ErrorCategory.DISCOVERY);
            this.setState({ error });
            reject(error);
          } else {
            resolve(this.state.hubs);
          }
        }, DISCOVERY_TIMEOUT);

      } catch (error) {
        this.cleanupDiscovery();
        const harmonyError = new HarmonyError("Discovery failed", ErrorCategory.DISCOVERY, error as Error);
        this.setState({ error: harmonyError });
        reject(harmonyError);
      }
    });

    try {
      const hubs = await this.discoveryLock;
      return hubs;
    } finally {
      this.discoveryLock = null;
      this.isDiscovering = false;
    }
  }

  /**
   * Clean up discovery resources
   */
  private async cleanupDiscovery(): Promise<void> {
    if (this.discoveryTimeout) {
      clearTimeout(this.discoveryTimeout);
      this.discoveryTimeout = null;
    }

    if (this.explorer) {
      try {
        await this.explorer.stop();
      } catch (error) {
        Logger.error("Error stopping explorer:", error);
      }
      this.explorer = null;
    }

    this.isDiscovering = false;
  }

  /**
   * Select and connect to a hub
   */
  public async selectHub(hub: HarmonyHub): Promise<void> {
    if (this.client?.hub?.id === hub.id) {
      Logger.info("Already connected to selected hub");
      return;
    }

    // Disconnect from current hub
    if (this.client) {
      await this.client.disconnect();
    }

    // Create new client
    this.client = new HarmonyClient(hub);
    
    this.setState({
      selectedHub: hub,
      loadingState: {
        stage: HarmonyStage.CONNECTING,
        progress: 0,
        message: `Connecting to ${hub.name}...`
      }
    });

    try {
      await this.client.connect();
      
      // Load devices and activities
      const [devices, activities] = await Promise.all([
        this.client.getDevices(),
        this.client.getActivities()
      ]);

      this.setState({
        devices,
        activities,
        loadingState: {
          stage: HarmonyStage.COMPLETE,
          progress: 1,
          message: "Connected"
        }
      });

    } catch (error) {
      const harmonyError = new HarmonyError(
        "Failed to connect to hub",
        ErrorCategory.CONNECTION,
        error as Error
      );
      this.setState({ error: harmonyError });
      throw harmonyError;
    }
  }

  /**
   * Execute a command
   */
  public async executeCommand(command: HarmonyCommand): Promise<void> {
    if (!this.client) {
      throw new HarmonyError("No hub selected", ErrorCategory.STATE);
    }

    await this.client.executeCommand(command);
  }

  /**
   * Get current state
   */
  public getState(): HarmonyState {
    return this.state;
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    await this.cleanupDiscovery();
    
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }

    this.setState({
      selectedHub: null,
      devices: [],
      activities: [],
      currentActivity: null,
      loadingState: {
        stage: HarmonyStage.DISCOVERING,
        progress: 0,
        message: "Disconnected"
      }
    });
  }
}
