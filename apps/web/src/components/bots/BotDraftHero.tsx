import type { Bot } from "@t3tools/contracts";

import { BotAvatar } from "./BotAvatar";

export function BotDraftHero({ bot }: { bot: Bot }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 text-center">
      <BotAvatar avatar={bot.avatar} color={bot.color} size="lg" />
      <h1 className="font-normal text-2xl text-foreground tracking-tight sm:text-3xl">
        {bot.name}
      </h1>
      <p className="text-sm text-muted-foreground">
        {bot.job || "Tell me what my job is, and I will remember it."}
      </p>
    </div>
  );
}
