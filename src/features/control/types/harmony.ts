export interface HarmonyHub {
  id: string;
  ip: string;
  name: string;
  remoteId: string;
  hubId: string;
  version: string;
  port?: string;
}

export interface HarmonyDevice {
  id: string;
  label: string;
  type: string;
  commands: HarmonyCommand[];
}

export interface HarmonyCommand {
  id: string;
  name: string;
  label: string;
  deviceId: string;
}

export interface HarmonyActivity {
  id: string;
  label: string;
  isAVActivity: boolean;
  activityTypeDisplayName: string;
  controlGroup: any[];
  fixit: any;
  rules: any[];
  sequences: any[];
  suggestedDisplay: string;
  type: string;
  status: string;
}
