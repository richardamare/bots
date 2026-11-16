import {
  createEnvironmentRpcCommand,
  createEnvironmentRpcQueryAtomFamily,
} from "@t3tools/client-runtime/state/runtime";
import { WS_METHODS } from "@t3tools/contracts";

import { connectionAtomRuntime } from "../connection/runtime";

export const botsList = createEnvironmentRpcQueryAtomFamily(connectionAtomRuntime, {
  label: "environment-data:bots:list",
  tag: WS_METHODS.botsList,
  staleTimeMs: 30_000,
  idleTtlMs: 300_000,
});

export const botsCreate = createEnvironmentRpcCommand(connectionAtomRuntime, {
  label: "environment-data:bots:create",
  tag: WS_METHODS.botsCreate,
});
