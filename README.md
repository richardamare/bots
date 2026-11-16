# Bots

Bots are teammates with one job, a memory that grows and their own chat. They run on the Claude subscription you already have.

Bots is a fork of [T3 Code](https://github.com/pingdotgg/t3code). The Code view is still there, but the app opens on your bots.

## How a bot works

- **One chat each.** A bot sits in the sidebar like a contact. Its chat never settles away, and a dot tells you when it has written to you.
- **A folder of its own.** Each bot lives in `~/.bots/bots/<name>/`, with its persona in `AGENTS.md` and its memory in `memory/`. Rules, facts and a daily log are plain Markdown you can edit.
- **Shared profile.** `~/.bots/bots/shared/me.md` holds what every bot should know about you.
- **Routines.** Ask a bot to remind you or to check something every morning. It schedules the work into its own chat.
- **Teamwork.** Bots find each other with `t3_thread_list` and hand work over with `t3_thread_send`. The first bot you create is the main one and routes work to the others.
- **Memory beside the chat.** The details panel shows the bot's rules, facts, today's log and its routines.

New bots use Claude Opus 5.5.

## Install

Bots runs on macOS with Apple silicon. Paste this into Terminal:

```sh
curl -fsSL https://raw.githubusercontent.com/richardamare/bots/main/install.sh | sh
```

It downloads the latest release, puts `Bots.app` in Applications and opens it. Run the same line again to update.

You can also download the DMG from [Releases](https://github.com/richardamare/bots/releases/latest). The app is not notarized, so macOS blocks the first launch. Open System Settings, then Privacy & Security, and click Open Anyway.

Bots keeps its data in `~/.bots`, apart from any T3 Code install.

## Release

Push a tag such as `v1.0.1`, or run the Release Bots workflow with a version. GitHub Actions builds the DMG and publishes the release.

## Run from source

```sh
pnpm install
pnpm dev
```

Open the web URL it prints and pair with the token in the log.

The [development runbook](./docs/operations/development.md#first-checkout) and the [architecture overview](./docs/internals/overview.md) still apply.

## License

[MIT](./LICENSE)
