import en from '../../../locales/en.json';
import tracks from './tracks.json';

export type Locales = Record<string, string>;

export interface Tip {
  id: string;
  key: string | null;
}

export interface Track {
  file: string;
  title: string;
  artist: string;
}

export interface MusicConfig {
  volume: number;
  tracks: Track[];
}

export interface LoadingConfig {
  serverName: string;
  tips: [Tip, ...Tip[]];
  music: MusicConfig;
  locales: Locales;
}

declare global {
  interface Window {
    nuiHandoverData?: unknown;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function flatten(tree: Record<string, unknown>, prefix = '', into: Locales = {}): Locales {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;

    if (typeof value === 'string') into[path] = value;
    else if (isRecord(value)) flatten(value, path, into);
  }

  return into;
}

const defaults: LoadingConfig = {
  serverName: 'Northside Roleplay',
  tips: [
    { id: 'inventory', key: 'Tab' },
    { id: 'phone', key: 'M' },
    { id: 'lock', key: 'L' },
  ],
  music: { volume: 0.25, tracks },
  locales: flatten(en),
};

function toTip(value: unknown): Tip | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id === '') return null;

  return { id: value.id, key: typeof value.key === 'string' && value.key !== '' ? value.key : null };
}

function toTips(value: unknown): LoadingConfig['tips'] {
  if (!Array.isArray(value)) return defaults.tips;

  const [first, ...rest] = value.map(toTip).filter((tip) => tip !== null);
  return first ? [first, ...rest] : defaults.tips;
}

function toMusic(value: unknown): MusicConfig {
  if (!isRecord(value) || typeof value.volume !== 'number') return defaults.music;

  return { volume: Math.min(1, Math.max(0, value.volume)), tracks };
}

function toLocales(value: unknown): Locales {
  return isRecord(value) ? { ...defaults.locales, ...flatten(value) } : defaults.locales;
}

function toConfig(value: unknown): LoadingConfig {
  if (!isRecord(value)) return defaults;

  return {
    serverName: typeof value.serverName === 'string' ? value.serverName : defaults.serverName,
    tips: toTips(value.tips),
    music: toMusic(value.music),
    locales: toLocales(value.locales),
  };
}

export const config = toConfig(window.nuiHandoverData);
