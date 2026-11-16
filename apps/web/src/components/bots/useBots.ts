import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import type { Bot, EnvironmentId, ScopedProjectRef } from "@t3tools/contracts";

import { botsList } from "../../state/bots";
import { primaryEnvironmentIdAtom } from "../../state/primaryEnvironment";
import { useEnvironmentQuery } from "../../state/query";

export function usePrimaryBots() {
  const environmentId = useAtomValue(primaryEnvironmentIdAtom);
  const query = useEnvironmentQuery(
    environmentId === null ? null : botsList({ environmentId, input: {} }),
  );
  return { environmentId, bots: query.data?.bots ?? [], query };
}

export function useBot(projectRef: ScopedProjectRef | null): Bot | null {
  const { environmentId, bots } = usePrimaryBots();
  if (projectRef === null || projectRef.environmentId !== environmentId) return null;
  return bots.find((bot) => bot.projectId === projectRef.projectId) ?? null;
}

/** A bot's chat is its project's newest live thread. */
export function botChatThread(
  bot: Bot,
  environmentId: EnvironmentId,
  threads: ReadonlyArray<EnvironmentThreadShell>,
): EnvironmentThreadShell | null {
  let newest: EnvironmentThreadShell | null = null;
  for (const thread of threads) {
    if (thread.environmentId !== environmentId || thread.projectId !== bot.projectId) continue;
    if (thread.archivedAt !== null || thread.deletedAt !== null) continue;
    if (newest === null || thread.createdAt > newest.createdAt) newest = thread;
  }
  return newest;
}
