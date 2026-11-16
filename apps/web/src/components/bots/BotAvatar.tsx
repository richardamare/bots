import type { BotAvatar as BotAvatarName, ProjectIconColor } from "@t3tools/contracts";
import {
  BotIcon,
  BrainIcon,
  CalendarClockIcon,
  CodeIcon,
  HeartIcon,
  ListChecksIcon,
  MailIcon,
  NotebookPenIcon,
  RocketIcon,
  SearchIcon,
  StarIcon,
  SunriseIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { PROJECT_ICON_COLORS } from "../../projectIconColors";

export const BOT_AVATAR_ICONS: Record<BotAvatarName, LucideIcon> = {
  bot: BotIcon,
  star: StarIcon,
  "notebook-pen": NotebookPenIcon,
  "calendar-clock": CalendarClockIcon,
  "list-checks": ListChecksIcon,
  sunrise: SunriseIcon,
  mail: MailIcon,
  search: SearchIcon,
  code: CodeIcon,
  heart: HeartIcon,
  rocket: RocketIcon,
  brain: BrainIcon,
};

export const BOT_COLORS: ReadonlyArray<ProjectIconColor> = [
  "violet",
  "sky",
  "emerald",
  "amber",
  "rose",
  "orange",
  "teal",
  "indigo",
  "lime",
  "fuchsia",
  "gray",
];

const colorClasses = (color: ProjectIconColor) =>
  PROJECT_ICON_COLORS.find((entry) => entry.value === color) ?? PROJECT_ICON_COLORS[0]!;

export function BotAvatar(props: {
  avatar: BotAvatarName;
  color: ProjectIconColor;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = BOT_AVATAR_ICONS[props.avatar];
  const { className: textClassName, swatchClassName } = colorClasses(props.color);
  const size = props.size ?? "md";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden",
        size === "sm" && "size-6 rounded-md",
        size === "md" && "size-9 rounded-xl",
        size === "lg" && "size-14 rounded-2xl",
        textClassName,
        props.className,
      )}
    >
      <span className={cn("absolute inset-0 opacity-15", swatchClassName)} />
      <Icon
        className={cn(
          "relative",
          size === "sm" && "size-3.5",
          size === "md" && "size-5",
          size === "lg" && "size-7",
        )}
      />
    </span>
  );
}
