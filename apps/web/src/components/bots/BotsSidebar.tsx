import { scopeProjectRef, scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import type { Bot } from "@t3tools/contracts";
import { useParams, useRouter } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { isElectron } from "../../env";
import { useNewThreadHandler } from "../../hooks/useHandleNewThread";
import { cn } from "../../lib/utils";
import { useQuietThreadShells } from "../../state/entities";
import { buildThreadRouteParams } from "../../threadRoutes";
import { resolveSidebarFolderDot } from "../Sidebar.logic";
import { SidebarChromeFooter, SidebarChromeHeader } from "../sidebar/SidebarChrome";
import { Button } from "../ui/button";
import { SidebarContent, SidebarGroup, useSidebar } from "../ui/sidebar";
import { BotAvatar } from "./BotAvatar";
import { NewBotDialog } from "./NewBotDialog";
import { SidebarModeSwitch } from "./sidebarMode";
import { botChatThread, usePrimaryBots } from "./useBots";

type BotDot = ReturnType<typeof resolveSidebarFolderDot>;

const DOT_LABEL: Record<NonNullable<BotDot>, string> = {
  attention: "Needs you",
  failed: "Something failed",
  unread: "New message",
  working: "Working…",
};

export default function BotsSidebar() {
  const { environmentId, bots, query } = usePrimaryBots();
  const threads = useQuietThreadShells();
  const router = useRouter();
  const handleNewThread = useNewThreadHandler();
  const { isMobile, setOpenMobile } = useSidebar();
  const params = useParams({ strict: false });
  const [creating, setCreating] = useState(false);

  const openBot = (bot: Bot, thread: EnvironmentThreadShell | null) => {
    if (environmentId === null) return;
    if (isMobile) setOpenMobile(false);
    if (thread !== null) {
      void router.navigate({
        to: "/$environmentId/$threadId",
        params: buildThreadRouteParams(scopeThreadRef(environmentId, thread.id)),
      });
      return;
    }
    void handleNewThread(scopeProjectRef(environmentId, bot.projectId));
  };

  return (
    <>
      <SidebarChromeHeader isElectron={isElectron} />
      <SidebarModeSwitch />
      <SidebarContent className="min-h-full">
        <SidebarGroup>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-xs font-medium text-muted-foreground">Your bots</span>
              <Button
                aria-label="New bot"
                size="icon-xs"
                variant="ghost"
                disabled={environmentId === null}
                onClick={() => setCreating(true)}
              >
                <PlusIcon />
              </Button>
            </div>
            {bots.length === 0 && !query.isPending ? (
              <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                <p>Bots are teammates with a job, memory and their own chat.</p>
                <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
                  <PlusIcon />
                  Create your first bot
                </Button>
              </div>
            ) : null}
            {environmentId === null
              ? null
              : bots.map((bot) => {
                  const thread = botChatThread(bot, environmentId, threads);
                  const dot = thread === null ? null : resolveSidebarFolderDot([thread]);
                  const active =
                    thread !== null &&
                    params.environmentId === environmentId &&
                    params.threadId === thread.id;
                  return (
                    <button
                      key={bot.projectId}
                      type="button"
                      data-bot={bot.name}
                      aria-current={active ? "page" : undefined}
                      onClick={() => openBot(bot, thread)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-hidden transition-colors hover:bg-sidebar-row-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        active && "bg-sidebar-row-selected",
                      )}
                    >
                      <span className="relative">
                        <BotAvatar avatar={bot.avatar} color={bot.color} />
                        {dot === null ? null : (
                          <span
                            className={cn(
                              "absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-sidebar",
                              dot === "attention" && "bg-warning",
                              dot === "failed" && "bg-error",
                              dot === "unread" && "bg-info",
                              dot === "working" && "bg-success",
                            )}
                          />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "truncate text-sm",
                              dot === "unread" || dot === "attention"
                                ? "font-semibold"
                                : "font-medium",
                            )}
                          >
                            {bot.name}
                          </span>
                          {bot.primary ? (
                            <span className="shrink-0 rounded-full bg-muted px-1.5 text-3xs text-muted-foreground">
                              main
                            </span>
                          ) : null}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {dot === null ? bot.job || "No job yet" : DOT_LABEL[dot]}
                        </span>
                      </span>
                    </button>
                  );
                })}
          </div>
        </SidebarGroup>
      </SidebarContent>
      <SidebarChromeFooter />
      {creating && environmentId !== null ? (
        <NewBotDialog
          environmentId={environmentId}
          onClose={() => setCreating(false)}
          onCreated={(bot) => {
            setCreating(false);
            query.refresh();
            openBot(bot, null);
          }}
        />
      ) : null}
    </>
  );
}
