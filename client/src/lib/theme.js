/**
 * Column accents in the SHEKEL brand palette.
 *
 * The layout mirrors the logo itself: teal figures on the outside, purple
 * toward the middle, with the deep-purple figure at the centre — exactly where
 * the FREE heart cell sits. Class names are written out in full because
 * Tailwind scans source text; `bg-${color}` would never make it into the CSS.
 */
export const COLUMNS = [
  {
    letter: 'B',
    text: 'text-sk-teal-3',
    fill: 'from-sk-teal to-sk-teal-2',
    glow: 'shadow-sk-teal-2/40',
    ring: 'ring-sk-teal-2/50',
    dot: 'bg-sk-teal',
  },
  {
    letter: 'I',
    text: 'text-sk-purple-2',
    fill: 'from-sk-purple-3 to-sk-purple-2',
    glow: 'shadow-sk-purple-2/40',
    ring: 'ring-sk-purple-2/50',
    dot: 'bg-sk-purple-3',
  },
  {
    letter: 'N',
    text: 'text-sk-purple',
    fill: 'from-sk-purple to-sk-purple-deep',
    glow: 'shadow-sk-purple/40',
    ring: 'ring-sk-purple/50',
    dot: 'bg-sk-purple',
  },
  {
    letter: 'G',
    text: 'text-sk-purple-2',
    fill: 'from-sk-purple-3 to-sk-purple-2',
    glow: 'shadow-sk-purple-2/40',
    ring: 'ring-sk-purple-2/50',
    dot: 'bg-sk-purple-3',
  },
  {
    letter: 'O',
    text: 'text-sk-teal-3',
    fill: 'from-sk-teal to-sk-teal-2',
    glow: 'shadow-sk-teal-2/40',
    ring: 'ring-sk-teal-2/50',
    dot: 'bg-sk-teal',
  },
];
