import {
  Bot,
  type BotCreateInput,
  type BotDeleteInput,
  BotError,
  type BotMemoryFile,
  type BotMemoryInput,
  type BotMemoryResult,
  CommandId,
  ProjectId,
  ProviderInstanceId,
} from "@t3tools/contracts";
import { newProjectFolderName } from "@t3tools/shared/path";
import * as Context from "effect/Context";
import * as SecureRandom from "effect/crypto/SecureRandom";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import * as ServerConfig from "../config.ts";
import * as ProjectService from "../project/ProjectService.ts";
import * as ServerSettings from "../serverSettings.ts";
import { botAgentsMd, botClaudeMd, botMemoryFiles, sharedMeMd } from "./botTemplates.ts";

const BotManifest = Bot.mapFields(({ folder: _folder, ...fields }) => fields);
type BotManifest = typeof BotManifest.Type;
const BotManifestJson = Schema.fromJsonString(BotManifest);
const decodeManifest = Schema.decodeUnknownEffect(BotManifestJson);
const encodeManifest = Schema.encodeEffect(BotManifestJson);

const MANIFEST_FILE = "bot.json";
const MAX_FOLDER_ATTEMPTS = 100;
const BOT_MODEL = {
  instanceId: ProviderInstanceId.make("claudeAgent"),
  model: "claude-opus-5-5",
};

export class BotService extends Context.Service<
  BotService,
  {
    readonly root: string;
    readonly list: Effect.Effect<ReadonlyArray<Bot>, BotError>;
    readonly create: (input: BotCreateInput) => Effect.Effect<Bot, BotError>;
    readonly delete: (input: BotDeleteInput) => Effect.Effect<void, BotError>;
    readonly memory: (input: BotMemoryInput) => Effect.Effect<BotMemoryResult, BotError>;
  }
>()("t3/bots/BotService") {}

const botError = (message: string) => () => new BotError({ message });

const make = Effect.gen(function* () {
  const config = yield* ServerConfig.ServerConfig;
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const projects = yield* ProjectService.ProjectService;
  const serverSettings = yield* ServerSettings.ServerSettingsService;
  const random = yield* SecureRandom.SecureRandom;

  const root = path.resolve(config.baseDir, "bots");
  const sharedFolder = path.join(root, "shared");
  const trashFolder = path.join(root, ".deleted");

  const readBot = (folder: string) =>
    fileSystem.readFileString(path.join(folder, MANIFEST_FILE)).pipe(
      Effect.flatMap(decodeManifest),
      Effect.flatMap((manifest) =>
        projects.getById(manifest.projectId).pipe(
          Effect.map(
            Option.match({
              onNone: () => Option.none<Bot>(),
              onSome: () => Option.some({ ...manifest, folder }),
            }),
          ),
        ),
      ),
      Effect.orElseSucceed(() => Option.none<Bot>()),
    );

  const list: BotService["Service"]["list"] = Effect.gen(function* () {
    const exists = yield* fileSystem.exists(root).pipe(Effect.orElseSucceed(() => false));
    if (!exists) return [];
    const entries = yield* fileSystem
      .readDirectory(root)
      .pipe(Effect.mapError(botError(`Could not read the bots folder ${root}.`)));
    const bots = yield* Effect.forEach(
      entries.filter((entry) => !entry.startsWith(".") && entry !== "shared"),
      (entry) => readBot(path.join(root, entry)),
      { concurrency: 8 },
    );
    return bots
      .filter(Option.isSome)
      .map((bot) => bot.value)
      .toSorted((a, b) =>
        a.primary === b.primary ? a.name.localeCompare(b.name) : a.primary ? -1 : 1,
      );
  }).pipe(Effect.withSpan("BotService.list"));

  const claimFolder = Effect.fn("BotService.claimFolder")(function* (name: string) {
    const base = newProjectFolderName(name);
    for (let attempt = 1; attempt <= MAX_FOLDER_ATTEMPTS; attempt++) {
      const folder = path.join(root, attempt === 1 ? base : `${base}-${attempt}`);
      const claimed = yield* fileSystem.makeDirectory(folder).pipe(
        Effect.as(true),
        Effect.catchIf(
          (error) => error.reason._tag === "AlreadyExists",
          () => Effect.succeed(false),
        ),
      );
      if (claimed) return folder;
    }
    return yield* new BotError({ message: `Every folder name for "${base}" is taken.` });
  });

  const writeIfMissing = (file: string, content: string) =>
    fileSystem
      .exists(file)
      .pipe(
        Effect.flatMap((exists) =>
          exists ? Effect.void : fileSystem.writeFileString(file, content),
        ),
      );

  const scaffold = Effect.fn("BotService.scaffold")(function* (
    folder: string,
    manifest: BotManifest,
  ) {
    yield* fileSystem.makeDirectory(sharedFolder, { recursive: true });
    yield* writeIfMissing(path.join(sharedFolder, "me.md"), sharedMeMd);
    yield* fileSystem.writeFileString(path.join(folder, "AGENTS.md"), botAgentsMd(manifest));
    yield* fileSystem.writeFileString(path.join(folder, "CLAUDE.md"), botClaudeMd);
    yield* fileSystem.makeDirectory(path.join(folder, "memory", "log"), { recursive: true });
    for (const [file, content] of botMemoryFiles) {
      yield* fileSystem.writeFileString(path.join(folder, "memory", file), content);
    }
    yield* fileSystem.writeFileString(
      path.join(folder, MANIFEST_FILE),
      `${yield* encodeManifest(manifest)}\n`,
    );
  });

  const create: BotService["Service"]["create"] = Effect.fn("BotService.create")(function* (input) {
    yield* fileSystem
      .makeDirectory(root, { recursive: true })
      .pipe(Effect.mapError(botError(`Could not create the bots folder ${root}.`)));
    const existing = yield* list;
    const folder = yield* claimFolder(input.name).pipe(
      Effect.mapError((cause) =>
        cause._tag === "BotError"
          ? cause
          : new BotError({ message: `Could not create a folder for ${input.name}.` }),
      ),
    );
    const id = yield* random.uuidV4().pipe(Effect.mapError(botError("Could not make an id.")));
    const manifest: BotManifest = {
      projectId: ProjectId.make(id),
      name: input.name,
      job: input.job.trim(),
      avatar: input.avatar,
      color: input.color,
      primary: existing.length === 0,
    };
    const created = yield* Effect.gen(function* () {
      yield* scaffold(folder, manifest).pipe(
        Effect.mapError(botError(`Could not write ${input.name}'s files in ${folder}.`)),
      );
      yield* projects
        .create({
          commandId: CommandId.make(`bot-project:${id}`),
          projectId: manifest.projectId,
          title: input.name,
          workspaceRoot: folder,
        })
        .pipe(Effect.mapError((cause) => new BotError({ message: cause.message })));
      yield* projects
        .update({
          commandId: CommandId.make(`bot-project-icon:${id}`),
          projectId: manifest.projectId,
          projectIcon: { kind: "lucide", name: input.avatar, color: input.color },
        })
        .pipe(Effect.mapError((cause) => new BotError({ message: cause.message })));
      // A bot's chat is long-lived, so it never settles on its own.
      yield* serverSettings
        .updateSettings({
          projectSettingsOverrides: {
            [manifest.projectId]: {
              defaultModelSelection: BOT_MODEL,
              sidebarAutoSettleAfterDays: null,
              sidebarAutoSettleOnMerge: false,
            },
          },
        })
        .pipe(Effect.mapError(botError(`Could not save ${input.name}'s settings.`)));
      return { ...manifest, folder };
    }).pipe(
      Effect.onExit((exit) =>
        Exit.isSuccess(exit)
          ? Effect.void
          : projects.getByWorkspaceRoot(folder).pipe(
              Effect.flatMap((owner) =>
                Option.isNone(owner) ? fileSystem.remove(folder, { recursive: true }) : Effect.void,
              ),
              Effect.ignore,
            ),
      ),
    );
    return created;
  });

  const remove: BotService["Service"]["delete"] = Effect.fn("BotService.delete")(function* (input) {
    const bots = yield* list;
    const bot = bots.find((candidate) => candidate.projectId === input.projectId);
    if (bot === undefined) {
      return yield* new BotError({ message: "That bot no longer exists." });
    }
    yield* projects
      .delete({
        commandId: CommandId.make(`bot-delete:${input.projectId}`),
        projectId: input.projectId,
        force: true,
      })
      .pipe(Effect.mapError((cause) => new BotError({ message: cause.message })));
    yield* serverSettings
      .updateSettings({ projectSettingsOverrides: { [input.projectId]: null } })
      .pipe(Effect.ignore);
    // The folder holds the bot's memory, so it moves aside instead of disappearing.
    yield* fileSystem.makeDirectory(trashFolder, { recursive: true }).pipe(
      Effect.flatMap(() =>
        fileSystem.rename(
          bot.folder,
          path.join(trashFolder, `${path.basename(bot.folder)}-${input.projectId.slice(0, 8)}`),
        ),
      ),
      Effect.mapError(botError(`${bot.name} is deleted, but its folder ${bot.folder} stayed.`)),
    );
  });

  const readMemoryFile = (folder: string, relative: string) =>
    fileSystem.readFileString(path.join(folder, relative)).pipe(
      Effect.map((content): Option.Option<BotMemoryFile> =>
        Option.some({ path: relative, content }),
      ),
      Effect.orElseSucceed(() => Option.none<BotMemoryFile>()),
    );

  const memory: BotService["Service"]["memory"] = Effect.fn("BotService.memory")(function* (input) {
    const bots = yield* list;
    const bot = bots.find((candidate) => candidate.projectId === input.projectId);
    if (bot === undefined) {
      return yield* new BotError({ message: "That bot no longer exists." });
    }
    const logs = yield* fileSystem
      .readDirectory(path.join(bot.folder, "memory", "log"))
      .pipe(Effect.orElseSucceed((): ReadonlyArray<string> => []));
    const newestLog = logs
      .filter((entry) => entry.endsWith(".md"))
      .toSorted()
      .at(-1);
    const files = yield* Effect.forEach(
      [
        "memory/rules.md",
        "memory/facts.md",
        ...(newestLog === undefined ? [] : [`memory/log/${newestLog}`]),
        "../shared/me.md",
      ],
      (relative) => readMemoryFile(bot.folder, relative),
    );
    return { files: files.filter(Option.isSome).map((file) => file.value) };
  });

  return BotService.of({ root, list, create, delete: remove, memory });
});

export const layer = Layer.effect(BotService, make);
