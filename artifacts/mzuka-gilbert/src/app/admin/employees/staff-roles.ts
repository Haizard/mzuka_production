export const STAFF_ROLES = [
  { value: "ADMIN",              label: "Admin",              colour: "bg-[var(--gold)]/20 text-[var(--gold)]" },
  { value: "PRODUCTION_MANAGER", label: "Production Manager", colour: "bg-violet-500/15 text-violet-300" },
  { value: "PHOTOGRAPHER",       label: "Photographer",       colour: "bg-blue-500/15 text-blue-300" },
  { value: "VIDEO_EDITOR",       label: "Video Editor",       colour: "bg-cyan-500/15 text-cyan-300" },
  { value: "EDITOR",             label: "Photo Editor",       colour: "bg-indigo-500/15 text-indigo-300" },
  { value: "COORDINATOR",        label: "Coordinator",        colour: "bg-emerald-500/15 text-emerald-300" },
  { value: "DRIVER",             label: "Driver",             colour: "bg-amber-500/15 text-amber-300" },
  { value: "ASSISTANT",          label: "Assistant",          colour: "bg-zinc-500/15 text-zinc-400" },
  { value: "HUMAN_RESOURCE",     label: "Human Resource",     colour: "bg-rose-500/15 text-rose-300" },
] as const;

export type StaffRoleValue = (typeof STAFF_ROLES)[number]["value"];
