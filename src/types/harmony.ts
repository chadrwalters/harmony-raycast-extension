export interface HarmonyHub {
  id: string;
  ip: string;
  name: string;
  remoteId?: string;
  port?: string;
  hubId?: string;
  version?: string;
}

export interface HarmonyDevice {
  id: string;
  label: string;
  type?: string;
  commands?: HarmonyCommand[];
}

export interface HarmonyCommand {
  id: string;
  label: string;
  deviceId: string;
}

export interface HarmonyActivity {
  id: string;
  label: string;
  isAVActivity?: boolean;
  isTuningDefault?: boolean;
  status?: string;
  isActive?: boolean;
}

export enum ActivityStatus {
  STARTING = "starting",
  STARTED = "started",
  STOPPING = "stopping",
  STOPPED = "stopped",
}

export interface HarmonyState {
  currentActivity?: HarmonyActivity;
  discoveredHubs: HarmonyHub[];
  selectedHub?: HarmonyHub;
  devices: HarmonyDevice[];
  activities: HarmonyActivity[];
  error?: string;
}

export interface CachedHarmonyData {
  hub: HarmonyHub;
  timestamp: number;
  devices: HarmonyDevice[];
  activities: HarmonyActivity[];
}

export interface HarmonyResponse {
  id?: string;
  label?: string;
  type?: string;
  commands?: HarmonyCommand[];
  isAVActivity?: boolean;
  isTuningDefault?: boolean;
  status?: string;
  remoteId?: string;
  friendlyName?: string;
  ip?: string;
  deviceId?: string;
  action?: string;
}
