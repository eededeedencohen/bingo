/**
 * One accent per Bingo column. Class names are written out in full because
 * Tailwind scans source text — `bg-${color}-500` would never make it into the
 * generated CSS.
 */
export const COLUMNS = [
  {
    letter: 'B',
    text: 'text-sky-300',
    fill: 'from-sky-400 to-blue-600',
    glow: 'shadow-sky-500/40',
    ring: 'ring-sky-400/50',
    dot: 'bg-sky-400',
  },
  {
    letter: 'I',
    text: 'text-violet-300',
    fill: 'from-violet-400 to-indigo-600',
    glow: 'shadow-violet-500/40',
    ring: 'ring-violet-400/50',
    dot: 'bg-violet-400',
  },
  {
    letter: 'N',
    text: 'text-fuchsia-300',
    fill: 'from-fuchsia-400 to-pink-600',
    glow: 'shadow-fuchsia-500/40',
    ring: 'ring-fuchsia-400/50',
    dot: 'bg-fuchsia-400',
  },
  {
    letter: 'G',
    text: 'text-amber-300',
    fill: 'from-amber-400 to-orange-600',
    glow: 'shadow-amber-500/40',
    ring: 'ring-amber-400/50',
    dot: 'bg-amber-400',
  },
  {
    letter: 'O',
    text: 'text-emerald-300',
    fill: 'from-emerald-400 to-teal-600',
    glow: 'shadow-emerald-500/40',
    ring: 'ring-emerald-400/50',
    dot: 'bg-emerald-400',
  },
];

/** 1-15 -> column 0 ... 61-75 -> column 4. */
export const columnOf = (number) => Math.floor((number - 1) / 15);

export const styleFor = (number) => COLUMNS[columnOf(number)] ?? COLUMNS[0];
