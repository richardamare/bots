import * as Schema from "effect/Schema";

import { useLocalStorage } from "../../hooks/useLocalStorage";
import { Toggle, ToggleGroup } from "../ui/toggle-group";

const SidebarMode = Schema.Literals(["bots", "code"]);
type SidebarMode = typeof SidebarMode.Type;

export function useSidebarMode() {
  return useLocalStorage<SidebarMode, SidebarMode>("bots:sidebar-mode:v1", "bots", SidebarMode);
}

export function SidebarModeSwitch() {
  const [mode, setMode] = useSidebarMode();
  return (
    <div className="px-2 pb-2">
      <ToggleGroup
        aria-label="Sidebar"
        className="w-full *:flex-1"
        value={[mode]}
        onValueChange={(next) => {
          const value = next[0];
          if (value === "bots" || value === "code") setMode(value);
        }}
      >
        <Toggle value="bots">Bots</Toggle>
        <Toggle value="code">Code</Toggle>
      </ToggleGroup>
    </div>
  );
}
