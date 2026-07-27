/**
 * Column accents in the SHEKEL brand palette.
 *
 * Each size mirrors the logo's symmetry: teal figures on the outside, purple
 * toward the middle, the deep-purple figure at the centre. Class names are
 * written out in full because Tailwind scans source text; `bg-${color}` would
 * never make it into the CSS.
 */
const TEAL = {
  text: 'text-sk-teal-3',
  fill: 'from-sk-teal to-sk-teal-2',
  glow: 'shadow-sk-teal-2/40',
  ring: 'ring-sk-teal-2/50',
};

const PURPLE_SOFT = {
  text: 'text-sk-purple-2',
  fill: 'from-sk-purple-3 to-sk-purple-2',
  glow: 'shadow-sk-purple-2/40',
  ring: 'ring-sk-purple-2/50',
};

const PURPLE_DEEP = {
  text: 'text-sk-purple',
  fill: 'from-sk-purple to-sk-purple-deep',
  glow: 'shadow-sk-purple/40',
  ring: 'ring-sk-purple/50',
};

const BY_SIZE = {
  3: [TEAL, PURPLE_DEEP, TEAL],
  4: [TEAL, PURPLE_SOFT, PURPLE_SOFT, TEAL],
  5: [TEAL, PURPLE_SOFT, PURPLE_DEEP, PURPLE_SOFT, TEAL],
};

/** Accent styles for each column of an N-wide board. */
export const columnsFor = (size) => BY_SIZE[size] ?? BY_SIZE[5];

/** The classic header letters exist only on the classic size. */
export const LETTERS = ['B', 'I', 'N', 'G', 'O'];
