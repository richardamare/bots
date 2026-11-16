import type { Bot } from "@t3tools/contracts";

import { BotAvatar } from "./BotAvatar";

export function BotHeaderIdentity({ bot }: { bot: Bot }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <BotAvatar avatar={bot.avatar} color={bot.color} size="sm" />
      <h2 className="truncate text-sm font-medium">{bot.name}</h2>
    </div>
  );
}
