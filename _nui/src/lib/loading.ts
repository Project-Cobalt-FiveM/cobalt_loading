import { isRecord } from './config';
import { t } from './locale';

export const STAGES = [t('stage.connect'), t('stage.download'), t('stage.map'), t('stage.spawn')] as const;

export type StageIndex = 0 | 1 | 2 | 3;

type StageFill = readonly [number, number, number, number];

export interface LoadState {
  stage: StageIndex;
  progress: number;
  fill: StageFill;
  task: string;
  detail: string;
  initCount: number;
  files: { done: number; total: number };
  done: boolean;
}

const STAGE_TEXT: Record<StageIndex, { task: string; detail: string }> = {
  0: { task: t('status.connect.task'), detail: t('status.connect.detail') },
  1: { task: t('status.download.task'), detail: t('status.download.detail') },
  2: { task: t('status.map.task'), detail: t('status.map.detail') },
  3: { task: t('status.spawn.task'), detail: t('status.spawn.detail') },
};

export const initialState: LoadState = {
  stage: 0,
  progress: 0,
  fill: [0, 0, 0, 0],
  ...STAGE_TEXT[0],
  initCount: 0,
  files: { done: 0, total: 0 },
  done: false,
};

export type LoadEvent =
  | { kind: 'loadProgress'; fraction: number }
  | { kind: 'startInitFunctionOrder'; type: string; count: number }
  | { kind: 'initFunctionInvoking'; type: string; name: string; idx: number }
  | { kind: 'startDataFileEntries'; count: number }
  | { kind: 'onDataFileEntry'; name: string }
  | { kind: 'performMapLoadFunction'; idx: number }
  | { kind: 'endInitFunction'; type: string };

interface Phase {
  stage: StageIndex;
  from: number;
  to: number;
}

const INIT_PHASE: Record<string, Phase> = {
  INIT_CORE: { stage: 0, from: 0, to: 1 },
  INIT_BEFORE_MAP_LOADED: { stage: 2, from: 0, to: 1 / 3 },
  INIT_AFTER_MAP_LOADED: { stage: 2, from: 2 / 3, to: 1 },
  INIT_SESSION: { stage: 3, from: 0, to: 1 },
};

const MAP_PHASE: Phase = { stage: 2, from: 1 / 3, to: 2 / 3 };

const DOWNLOAD_PHASE: Phase = { stage: 1, from: 0, to: 1 };

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const str = (value: unknown) => (typeof value === 'string' ? value : null);

export function parseLoadEvent(msg: unknown): LoadEvent | null {
  if (!isRecord(msg)) return null;

  switch (msg.eventName) {
    case 'loadProgress': {
      const fraction = num(msg.loadFraction);
      return fraction === null ? null : { kind: 'loadProgress', fraction };
    }
    case 'startInitFunctionOrder': {
      const type = str(msg.type);
      return type === null ? null : { kind: 'startInitFunctionOrder', type, count: num(msg.count) ?? 0 };
    }
    case 'initFunctionInvoking': {
      const type = str(msg.type);
      const idx = num(msg.idx);
      if (type === null || idx === null) return null;

      return { kind: 'initFunctionInvoking', type, name: str(msg.name) ?? '', idx };
    }
    case 'startDataFileEntries':
      return { kind: 'startDataFileEntries', count: num(msg.count) ?? 0 };
    case 'onDataFileEntry':
      return { kind: 'onDataFileEntry', name: str(msg.name) ?? '' };
    case 'performMapLoadFunction':
      return { kind: 'performMapLoadFunction', idx: num(msg.idx) ?? 0 };
    case 'endInitFunction': {
      const type = str(msg.type);
      return type === null ? null : { kind: 'endInitFunction', type };
    }
    default:
      return null;
  }
}

const basename = (path: string) => path.split(/[\\/]/).pop() || path;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const mapFill = (fill: StageFill, f: (value: number, i: number) => number): StageFill => [
  f(fill[0], 0),
  f(fill[1], 1),
  f(fill[2], 2),
  f(fill[3], 3),
];

function withFill(state: LoadState, phase: Phase, within: number): LoadState {
  const value = phase.from + (phase.to - phase.from) * clamp01(within);
  if (value <= state.fill[phase.stage]) return state;

  return { ...state, fill: mapFill(state.fill, (current, i) => (i === phase.stage ? value : current)) };
}

function enter(state: LoadState, stage: StageIndex): LoadState {
  if (stage <= state.stage) return state;

  return { ...state, stage, ...STAGE_TEXT[stage], fill: mapFill(state.fill, (current, i) => (i < stage ? 1 : current)) };
}

export function reduce(state: LoadState, event: LoadEvent): LoadState {
  if (state.done) return state;

  switch (event.kind) {
    case 'loadProgress': {
      const progress = Math.min(event.fraction, 0.99);
      return progress > state.progress ? { ...state, progress } : state;
    }
    case 'startInitFunctionOrder': {
      const phase = INIT_PHASE[event.type];
      if (!phase) return { ...state, initCount: event.count };

      return { ...withFill(enter(state, phase.stage), phase, 0), initCount: event.count };
    }
    case 'initFunctionInvoking': {
      const phase = INIT_PHASE[event.type];
      if (phase?.stage !== state.stage || state.initCount === 0) return state;

      const step = event.idx + 1;
      const next = {
        ...state,
        task: event.name || state.task,
        detail: t('status.steps', Math.min(step, state.initCount), state.initCount),
      };
      return withFill(next, phase, step / state.initCount);
    }
    case 'startDataFileEntries': {
      const next = enter(state, 1);
      return { ...next, files: { done: 0, total: event.count } };
    }
    case 'onDataFileEntry': {
      const next = enter(state, 1);
      const done = next.files.done + 1;
      const files = { done, total: Math.max(next.files.total, done) };
      const task = event.name === '' ? next.task : t('status.file', basename(event.name));
      const detail = t('status.files', done, files.total);
      const phase = next.stage === 2 ? MAP_PHASE : DOWNLOAD_PHASE;
      return withFill({ ...next, files, task, detail }, phase, done / files.total);
    }
    case 'performMapLoadFunction': {
      const next = withFill(enter(state, 2), MAP_PHASE, 0);
      return { ...next, task: STAGE_TEXT[2].task, detail: t('status.map_step', event.idx) };
    }
    case 'endInitFunction': {
      if (event.type === 'INIT_SESSION') {
        return {
          ...state,
          stage: 3,
          progress: 1,
          fill: [1, 1, 1, 1],
          task: t('status.ready.task'),
          detail: t('status.ready.detail'),
          done: true,
        };
      }

      const phase = INIT_PHASE[event.type];
      return phase ? withFill(state, phase, 1) : state;
    }
  }
}
