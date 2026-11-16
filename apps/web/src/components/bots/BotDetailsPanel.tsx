import type { Bot, EnvironmentId, ThreadId } from "@t3tools/contracts";
import { ChevronRightIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { botsMemory } from "../../state/bots";
import { useEnvironmentQuery } from "../../state/query";
import ChatMarkdown from "../ChatMarkdown";
import { ThreadAutomationsPanel } from "../chat/ThreadAutomationsPanel";
import { ThreadDetailsCard } from "../chat/ThreadDetailsCard";
import { ThreadDetailsSection } from "../chat/ThreadDetailsSection";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../ui/collapsible";

const MEMORY_LABELS: Record<string, string> = {
  "memory/rules.md": "Rules",
  "memory/facts.md": "Facts",
  "../shared/me.md": "About you",
};

function memoryLabel(path: string) {
  return MEMORY_LABELS[path] ?? `Log ${path.slice("memory/log/".length).replace(/\.md$/, "")}`;
}

export function BotDetailsPanel(
  props: Pick<ComponentProps<typeof ThreadDetailsCard>, "anchor" | "handle"> & {
    bot: Bot;
    environmentId: EnvironmentId;
    threadId: ThreadId;
    isDraft: boolean;
  },
) {
  const memory = useEnvironmentQuery(
    botsMemory({ environmentId: props.environmentId, input: { projectId: props.bot.projectId } }),
  );
  const files = memory.data?.files ?? [];
  return (
    <ThreadDetailsCard
      threadRef={{ environmentId: props.environmentId, threadId: props.threadId }}
      anchor={props.anchor}
      handle={props.handle}
      contentKey={`bot:${props.isDraft}:${files.length}`}
    >
      {(density) => (
        <div>
          <ThreadDetailsSection
            headingId="bot-details-memory-heading"
            title="Memory"
            separated={false}
          >
            <div className="flex flex-col">
              {files.map((file) => (
                <Collapsible key={file.path}>
                  <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-sm outline-hidden hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-panel-open:[&_svg]:rotate-90">
                    <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{memoryLabel(file.path)}</span>
                  </CollapsibleTrigger>
                  <CollapsiblePanel>
                    <div className="max-h-72 overflow-y-auto px-2.5 pt-1 pb-2">
                      <ChatMarkdown
                        text={file.content.replace(/^# .*\n+/, "")}
                        cwd={props.bot.folder}
                        className="text-xs"
                      />
                    </div>
                  </CollapsiblePanel>
                </Collapsible>
              ))}
            </div>
          </ThreadDetailsSection>
          {density === "full" && !props.isDraft ? (
            <ThreadAutomationsPanel environmentId={props.environmentId} threadId={props.threadId} />
          ) : null}
        </div>
      )}
    </ThreadDetailsCard>
  );
}
