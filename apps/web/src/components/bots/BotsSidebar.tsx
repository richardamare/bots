import { scopeProjectRef, scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import type { Bot, EnvironmentId } from "@t3tools/contracts";
import { useParams, useRouter } from "@tanstack/react-router";
import { EllipsisIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { requestConfirmDialog } from "../../confirmDialog";
import { isElectron } from "../../env";
import { useNewThreadHandler } from "../../hooks/useHandleNewThread";
import { cn } from "../../lib/utils";
import { botsDelete } from "../../state/bots";
import { useQuietThreadShells } from "../../state/entities";
import { useAtomCommand } from "../../state/use-atom-command";
import { buildThreadRouteParams } from "../../threadRoutes";
import { resolveSidebarFolderDot } from "../Sidebar.logic";
import { SidebarChromeFooter, SidebarChromeHeader } from "../sidebar/SidebarChrome";
import { Button } from "../ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../ui/menu";
import { SidebarContent, SidebarGroup, useSidebar } from "../ui/sidebar";
import { stackedThreadToast, toastManager } from "../ui/toast";
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
  const remove = useAtomCommand(botsDelete, { reportFailure: false });
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

  const deleteBot = async (bot: Bot) => {
    if (environmentId === null) return;
    const confirmed = await requestConfirmDialog(
      `Delete ${bot.name}? Its chat and routines go away. Its memory folder moves to bots/.deleted.`,
      { variant: "destructive" },
    );
    if (confirmed !== true) return;
    const result = await remove({ environmentId, input: { projectId: bot.projectId } });
    query.refresh();
    if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
      const failure = squashAtomCommandFailure(result);
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: `Could not delete ${bot.name}`,
          description: failure instanceof Error ? failure.message : "Try again.",
        }),
      );
    }
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
              : bots.map((bot) => (
                  <BotRow
                    key={bot.projectId}
                    bot={bot}
                    environmentId={environmentId}
                    thread={botChatThread(bot, environmentId, threads)}
                    routeThreadId={
                      params.environmentId === environmentId ? (params.threadId ?? null) : null
                    }
                    onOpen={openBot}
                    onDelete={(target) => void deleteBot(target)}
                  />
                ))}
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

function BotRow(props: {
  bot: Bot;
  environmentId: EnvironmentId;
  thread: EnvironmentThreadShell | null;
  routeThreadId: string | null;
  onOpen: (bot: Bot, thread: EnvironmentThreadShell | null) => void;
  onDelete: (bot: Bot) => void;
}) {
  const { bot, thread } = props;
  const dot = thread === null ? null : resolveSidebarFolderDot([thread]);
  const active = thread !== null && props.routeThreadId === thread.id;
  return (
    <div className="group/bot relative">
      <button
        type="button"
        data-bot={bot.name}
        aria-current={active ? "page" : undefined}
        onClick={() => props.onOpen(bot, thread)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-2 py-2 pr-9 text-left outline-hidden transition-colors hover:bg-sidebar-row-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
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
                dot === "unread" || dot === "attention" ? "font-semibold" : "font-medium",
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
      <div className="absolute top-1/2 right-1.5 -translate-y-1/2 opacity-0 transition-opacity group-hover/bot:opacity-100 has-[[aria-expanded=true]]:opacity-100 has-focus-visible:opacity-100">
        <Menu>
          <MenuTrigger
            render={<Button aria-label={`${bot.name} actions`} size="icon-xs" variant="ghost" />}
          >
            <EllipsisIcon />
          </MenuTrigger>
          <MenuPopup align="end">
            <MenuItem variant="destructive" onClick={() => props.onDelete(bot)}>
              <Trash2Icon />
              Delete bot
            </MenuItem>
          </MenuPopup>
        </Menu>
      </div>
    </div>
  );
}
