import HarmonyCommand from "./features/control/components/HarmonyCommand";
import { HarmonyProvider } from "./features/control/context/HarmonyContext";

export default function Command() {
  return (
    <HarmonyProvider>
      <HarmonyCommand />
    </HarmonyProvider>
  );
}
