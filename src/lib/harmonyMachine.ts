import { createMachine } from "xstate";
import type { HarmonyHub, HarmonyDevice, HarmonyActivity } from "../types/harmony";

interface HarmonyContext {
  state: {
    hubs: HarmonyHub[];
    selectedHub: HarmonyHub | null;
    devices: HarmonyDevice[];
    activities: HarmonyActivity[];
    currentActivity: string | null;
    error: string | null;
  };
}

export const harmonyMachine = createMachine({
  id: "harmony",
  initial: "idle",
  context: {
    state: {
      hubs: [],
      selectedHub: null,
      devices: [],
      activities: [],
      currentActivity: null,
      error: null,
    },
  },
  states: {
    idle: {
      on: {
        DISCOVER: "discovering",
        CONNECT: {
          target: "connecting",
          cond: (context: HarmonyContext) => !!context.state.selectedHub,
        },
        LOAD_CACHE: "loadingCache",
      },
    },
    loadingCache: {
      on: {
        CACHE_LOADED: {
          target: "connected",
          actions: ["updateStateFromCache"],
        },
        CACHE_EMPTY: "idle",
        ERROR: {
          target: "idle",
          actions: ["setError"],
        },
      },
    },
    discovering: {
      on: {
        HUB_FOUND: {
          target: "idle",
          actions: ["addDiscoveredHub"],
        },
        DISCOVERY_COMPLETE: "idle",
        ERROR: {
          target: "idle",
          actions: ["setError"],
        },
      },
    },
    connecting: {
      on: {
        CONNECTED: "fetchingConfig",
        ERROR: {
          target: "idle",
          actions: ["setError"],
        },
      },
    },
    fetchingConfig: {
      on: {
        CONFIG_LOADED: {
          target: "connected",
          actions: ["updateConfig"],
        },
        ERROR: {
          target: "idle",
          actions: ["setError"],
        },
      },
    },
    connected: {
      on: {
        DISCONNECT: "disconnecting",
        UPDATE_ACTIVITY: {
          actions: ["updateActivity"],
        },
        EXECUTE_COMMAND: {
          actions: ["executeCommand"],
        },
        ERROR: {
          target: "idle",
          actions: ["setError"],
        },
      },
    },
    disconnecting: {
      on: {
        DISCONNECTED: "idle",
        ERROR: {
          target: "idle",
          actions: ["setError"],
        },
      },
    },
  },
});
