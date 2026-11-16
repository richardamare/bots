import { assert, it } from "@effect/vitest";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { ProviderInstanceId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Scope from "effect/Scope";

import * as ServerConfig from "../config.ts";
import * as GitManager from "../git/GitManager.ts";
import * as GitWorkflow from "../git/GitWorkflowService.ts";
import * as RuntimeLayer from "../orchestration-v2/runtimeLayer.ts";
import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as ProjectEnrichmentService from "../project/ProjectEnrichmentService.ts";
import * as ProjectFaviconResolver from "../project/ProjectFaviconResolver.ts";
import * as ProjectService from "../project/ProjectService.ts";
import * as RepositoryIdentityResolver from "../project/RepositoryIdentityResolver.ts";
import * as ServerSettings from "../serverSettings.ts";
import * as GitVcsDriver from "../vcs/GitVcsDriver.ts";
import * as VcsDriverRegistry from "../vcs/VcsDriverRegistry.ts";
import * as VcsProcess from "../vcs/VcsProcess.ts";
import * as WorkspacePaths from "../workspace/WorkspacePaths.ts";
import * as BotService from "./BotService.ts";

const layerEnrichment = ProjectEnrichmentService.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      Layer.succeed(RepositoryIdentityResolver.RepositoryIdentityResolver, {
        resolve: () => Effect.succeed(null),
      }),
      Layer.succeed(ProjectFaviconResolver.ProjectFaviconResolver, {
        invalidate: () => Effect.void,
        resolvePath: () => Effect.succeed(null),
      }),
    ),
  ),
);

const layer = (baseDir: string) =>
  BotService.layer.pipe(
    Layer.provideMerge(RuntimeLayer.layerProjectService),
    Layer.provideMerge(layerEnrichment),
    Layer.provideMerge(WorkspacePaths.layer),
    Layer.provideMerge(
      GitWorkflow.layer.pipe(
        Layer.provide(VcsDriverRegistry.layer.pipe(Layer.provide(VcsProcess.layer))),
        Layer.provide(Layer.mock(GitManager.GitManager)({})),
      ),
    ),
    Layer.provideMerge(GitVcsDriver.layer.pipe(Layer.provide(VcsProcess.layer))),
    Layer.provideMerge(SqlitePersistence.layerMemory),
    Layer.provideMerge(ServerSettings.layerTest()),
    Layer.provideMerge(ServerConfig.layerTest(baseDir, baseDir)),
    Layer.provideMerge(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer)),
  );

const withBots = <A, E>(
  body: (input: {
    readonly baseDir: string;
  }) => Effect.Effect<
    A,
    E,
    | BotService.BotService
    | ProjectService.ProjectService
    | ServerSettings.ServerSettingsService
    | NodeServices.NodeServices
    | Scope.Scope
  >,
) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const baseDir = yield* fileSystem.makeTempDirectoryScoped({ prefix: "bots-service-" });
    return yield* body({ baseDir }).pipe(Effect.provide(layer(baseDir)));
  }).pipe(Effect.scoped, Effect.provide(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer)));

it.effect("creates a bot as a project with persona and memory files", () =>
  withBots(({ baseDir }) =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const projects = yield* ProjectService.ProjectService;
      const settings = yield* ServerSettings.ServerSettingsService;
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const scribe = yield* bots.create({
        name: "Scribe",
        job: "Turns meeting notes into tasks.",
        avatar: "notebook-pen",
        color: "violet",
      });
      const scheduler = yield* bots.create({
        name: "Scheduler",
        job: "",
        avatar: "calendar-clock",
        color: "sky",
      });

      assert.strictEqual(scribe.folder, path.join(baseDir, "bots", "scribe"));
      assert.isTrue(scribe.primary);
      assert.isFalse(scheduler.primary);
      const project = Option.getOrThrow(yield* projects.getById(scribe.projectId));
      assert.strictEqual(project.workspaceRoot, scribe.folder);
      assert.deepStrictEqual(project.projectIcon, {
        kind: "lucide",
        name: "notebook-pen",
        color: "violet",
      });
      const overrides = (yield* settings.getSettings).projectSettingsOverrides[scribe.projectId];
      assert.deepStrictEqual(overrides?.defaultModelSelection, {
        instanceId: ProviderInstanceId.make("claudeAgent"),
        model: "claude-opus-5-5",
      });
      assert.isNull(overrides?.sidebarAutoSettleAfterDays);
      const agents = yield* fileSystem.readFileString(path.join(scribe.folder, "AGENTS.md"));
      assert.include(agents, "Turns meeting notes into tasks.");
      assert.include(agents, "You are the main bot");
      assert.notInclude(
        yield* fileSystem.readFileString(path.join(scheduler.folder, "AGENTS.md")),
        "You are the main bot",
      );
      assert.isTrue(yield* fileSystem.exists(path.join(scribe.folder, "memory", "rules.md")));
      assert.isTrue(yield* fileSystem.exists(path.join(baseDir, "bots", "shared", "me.md")));

      const listed = yield* bots.list;
      assert.deepStrictEqual(
        listed.map((bot) => bot.name),
        ["Scribe", "Scheduler"],
      );
    }),
  ),
);

it.effect("gives a second bot with the same name its own folder", () =>
  withBots(() =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const path = yield* Path.Path;
      const input = { name: "Scout", job: "", avatar: "search", color: "lime" } as const;
      const first = yield* bots.create(input);
      const second = yield* bots.create(input);
      assert.strictEqual(path.basename(second.folder), `${path.basename(first.folder)}-2`);
    }),
  ),
);

it.effect("deletes a bot's project and keeps its memory aside", () =>
  withBots(({ baseDir }) =>
    Effect.gen(function* () {
      const bots = yield* BotService.BotService;
      const projects = yield* ProjectService.ProjectService;
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const bot = yield* bots.create({
        name: "Morning Brief",
        job: "",
        avatar: "sunrise",
        color: "amber",
      });
      yield* bots.delete({ projectId: bot.projectId });

      assert.isTrue(Option.isNone(yield* projects.getById(bot.projectId)));
      assert.isFalse(yield* fileSystem.exists(bot.folder));
      const trashed = yield* fileSystem.readDirectory(path.join(baseDir, "bots", ".deleted"));
      assert.strictEqual(trashed.length, 1);
      assert.deepStrictEqual(yield* bots.list, []);
    }),
  ),
);
