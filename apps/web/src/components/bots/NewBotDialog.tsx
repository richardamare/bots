import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import type {
  Bot,
  BotAvatar as BotAvatarName,
  EnvironmentId,
  ProjectIconColor,
} from "@t3tools/contracts";
import { useId, useState } from "react";

import { cn } from "~/lib/utils";
import { botsCreate } from "../../state/bots";
import { waitForProject } from "../../state/entities";
import { useAtomCommand } from "../../state/use-atom-command";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { BOT_AVATAR_ICONS, BOT_COLORS, BotAvatar } from "./BotAvatar";

const AVATARS = Object.keys(BOT_AVATAR_ICONS) as BotAvatarName[];

export function NewBotDialog(props: {
  environmentId: EnvironmentId;
  onClose: () => void;
  onCreated: (bot: Bot) => void;
}) {
  const id = useId();
  const create = useAtomCommand(botsCreate, { reportFailure: false });
  const [name, setName] = useState("");
  const [job, setJob] = useState("");
  const [avatar, setAvatar] = useState<BotAvatarName>("bot");
  const [color, setColor] = useState<ProjectIconColor>("violet");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (name.trim().length === 0) {
      setError("Give your bot a name.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await create({
      environmentId: props.environmentId,
      input: { name: name.trim(), job: job.trim(), avatar, color },
    });
    if (result._tag === "Failure") {
      setSaving(false);
      if (!isAtomCommandInterrupted(result)) {
        const failure = squashAtomCommandFailure(result);
        setError(failure instanceof Error ? failure.message : "Could not create the bot.");
      }
      return;
    }
    await waitForProject(scopeProjectRef(props.environmentId, result.value.projectId)).catch(
      () => null,
    );
    props.onCreated(result.value);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DialogPopup className="sm:max-w-md">
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>New bot</DialogTitle>
            <DialogDescription>
              A teammate with one job, its own chat and a memory that grows.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <BotAvatar avatar={avatar} color={color} size="lg" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Label htmlFor={`${id}-name`}>Name</Label>
                  <Input
                    id={`${id}-name`}
                    autoFocus
                    placeholder="Scribe"
                    value={name}
                    maxLength={60}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${id}-job`}>Job</Label>
                <Textarea
                  id={`${id}-job`}
                  placeholder="Turns my meeting notes into tasks and follows up on them."
                  value={job}
                  onChange={(event) => setJob(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Avatar</span>
                <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Avatar">
                  {AVATARS.map((candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      role="radio"
                      aria-checked={candidate === avatar}
                      aria-label={candidate}
                      onClick={() => setAvatar(candidate)}
                      className={cn(
                        "flex items-center justify-center rounded-xl p-1 outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        candidate === avatar && "ring-2 ring-primary",
                      )}
                    >
                      <BotAvatar avatar={candidate} color={color} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Colour</span>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
                  {BOT_COLORS.map((candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      role="radio"
                      aria-checked={candidate === color}
                      aria-label={candidate}
                      onClick={() => setColor(candidate)}
                      className={cn(
                        "rounded-lg p-0.5 outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        candidate === color && "ring-2 ring-primary",
                      )}
                    >
                      <BotAvatar avatar={avatar} color={candidate} size="sm" />
                    </button>
                  ))}
                </div>
              </div>
              {error === null ? null : <p className="text-sm text-destructive">{error}</p>}
            </div>
          </DialogPanel>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create bot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
