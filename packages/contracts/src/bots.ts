import * as Schema from "effect/Schema";
import { ProjectId, TrimmedNonEmptyString } from "./baseSchemas.ts";
import { ProjectIconColor } from "./project.ts";

const BOT_AVATARS = [
  "bot",
  "star",
  "notebook-pen",
  "calendar-clock",
  "list-checks",
  "sunrise",
  "mail",
  "search",
  "code",
  "heart",
  "rocket",
  "brain",
] as const;
export const BotAvatar = Schema.Literals(BOT_AVATARS);
export type BotAvatar = typeof BotAvatar.Type;

export const Bot = Schema.Struct({
  projectId: ProjectId,
  name: TrimmedNonEmptyString,
  job: Schema.String,
  avatar: BotAvatar,
  color: ProjectIconColor,
  primary: Schema.Boolean,
  folder: TrimmedNonEmptyString,
});
export type Bot = typeof Bot.Type;

export const BotsListResult = Schema.Struct({
  bots: Schema.Array(Bot),
});
export type BotsListResult = typeof BotsListResult.Type;

export const BotCreateInput = Schema.Struct({
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(60)),
  job: Schema.String.check(Schema.isMaxLength(2000)),
  avatar: BotAvatar,
  color: ProjectIconColor,
});
export type BotCreateInput = typeof BotCreateInput.Type;

export const BotDeleteInput = Schema.Struct({
  projectId: ProjectId,
});
export type BotDeleteInput = typeof BotDeleteInput.Type;

export class BotError extends Schema.TaggedError<BotError>()("BotError", {
  message: TrimmedNonEmptyString,
}) {}

export const BotMemoryInput = Schema.Struct({
  projectId: ProjectId,
});
export type BotMemoryInput = typeof BotMemoryInput.Type;

export const BotMemoryFile = Schema.Struct({
  path: TrimmedNonEmptyString,
  content: Schema.String,
});
export type BotMemoryFile = typeof BotMemoryFile.Type;

export const BotMemoryResult = Schema.Struct({
  files: Schema.Array(BotMemoryFile),
});
export type BotMemoryResult = typeof BotMemoryResult.Type;
