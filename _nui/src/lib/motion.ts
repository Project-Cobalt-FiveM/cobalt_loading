export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const rem = (px: number) => `${px / 16}rem`;
