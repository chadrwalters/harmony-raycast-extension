import React from "react";
import { HarmonyCommand } from "./ui/components/views/HarmonyCommand";
import { HarmonyProvider } from "./hooks/useHarmony";

export default function Command(): React.ReactElement {
  return (
    <HarmonyProvider>
      <HarmonyCommand />
    </HarmonyProvider>
  );
}
