/** Joins class names, skipping falsy values. */
export const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');
