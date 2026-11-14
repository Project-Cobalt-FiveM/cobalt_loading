import type { MusicConfig, Track } from './config';

const FADE_IN_MS = 1500;
const FADE_OUT_MS = 1000;
const CROSSFADE_MS = 1000;
const TICK_MS = 30;
const BLOCKED_AFTER_MS = 500;
const MUTED_KEY = 'cobalt_loading:muted';
const VOLUME_KEY = 'cobalt_loading:volume';

const BANDS: readonly [from: number, to: number][] = [
  [1, 4],
  [4, 17],
  [17, 61],
];

function load<T>(key: string, parse: (raw: string) => T | null, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return (raw === null ? null : parse(raw)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function parseVolume(raw: string) {
  const volume = Number(raw);
  return Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : null;
}

const clampVolume = (value: number) => Math.min(1, Math.max(0, Math.round(value * 100) / 100));

interface Ramp {
  value: number;
  from: number;
  to: number;
  start: number;
  ms: number;
}

const still = (value: number): Ramp => ({ value, from: value, to: value, start: 0, ms: 0 });

function rampTo(ramp: Ramp, to: number, ms: number) {
  Object.assign(ramp, { from: ramp.value, to, start: performance.now(), ms });
}

function advance(ramp: Ramp, now: number) {
  const t = ramp.ms <= 0 ? 1 : Math.min(1, (now - ramp.start) / ramp.ms);
  ramp.value = ramp.from + (ramp.to - ramp.from) * t;
}

interface Deck {
  audio: HTMLAudioElement;
  gain: GainNode;
  level: Ramp;
}

interface PlayerOptions {
  volume: number;
  muted: boolean;
  onTrack: (index: number) => void;
  onError: () => void;
  onBlocked: (blocked: boolean) => void;
}

function createPlayer(tracks: [Track, ...Track[]], options: PlayerOptions) {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.connect(master);
  master.connect(ctx.destination);

  const createDeck = (): Deck => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('error', options.onError);

    const gain = ctx.createGain();
    gain.gain.value = 0;
    ctx.createMediaElementSource(audio).connect(gain);
    gain.connect(analyser);

    return { audio, gain, level: still(0) };
  };

  const decks: [Deck, Deck] = [createDeck(), createDeck()];
  const envelope = still(0);
  const bins = new Uint8Array(128);
  let volume = options.volume;
  let muted = options.muted;
  let active: 0 | 1 = 0;
  let index = 0;

  const play = (deck: Deck) => {
    deck.audio.src = (tracks[index] ?? tracks[0]).file;
    deck.audio.play().catch((error: DOMException) => {
      if (error.name === 'NotAllowedError') options.onBlocked(true);
    });
  };

  const next = () => {
    const from = decks[active];
    active = active === 0 ? 1 : 0;
    index = (index + 1) % tracks.length;

    play(decks[active]);
    rampTo(decks[active].level, 1, CROSSFADE_MS);
    rampTo(from.level, 0, CROSSFADE_MS);
    options.onTrack(index);
  };

  for (const deck of decks) {
    deck.audio.addEventListener('ended', () => {
      if (deck === decks[active]) next();
    });
  }

  const tick = () => {
    const now = performance.now();
    advance(envelope, now);
    decks.forEach((deck) => advance(deck.level, now));

    for (const deck of decks) {
      deck.gain.gain.setTargetAtTime(deck.level.value, ctx.currentTime, 0.02);

      if (deck.level.value === 0 && deck.level.to === 0 && !deck.audio.paused) deck.audio.pause();
    }

    master.gain.setTargetAtTime((muted ? 0 : volume) * envelope.value, ctx.currentTime, 0.02);

    const { audio } = decks[active];
    if (audio.duration - audio.currentTime <= CROSSFADE_MS / 1000) next();
  };

  const blockedTimer = setTimeout(() => options.onBlocked(true), BLOCKED_AFTER_MS);
  void ctx.resume().then(() => clearTimeout(blockedTimer));

  play(decks[0]);
  decks[0].level = still(1);
  rampTo(envelope, 1, FADE_IN_MS);

  const timer = setInterval(tick, TICK_MS);

  return {
    setVolume(value: number) {
      volume = value;
    },
    setMuted(value: boolean) {
      muted = value;
    },
    fadeOut() {
      rampTo(envelope, 0, FADE_OUT_MS);
    },
    unlock() {
      Promise.all([ctx.resume(), decks[active].audio.play()])
        .then(() => {
          envelope.value = 0;
          rampTo(envelope, 1, FADE_IN_MS);
          options.onBlocked(false);
        })
        .catch(() => {});
    },
    readBands(out: number[]) {
      analyser.getByteFrequencyData(bins);
      BANDS.forEach(([from, to], i) => {
        let sum = 0;
        for (let bin = from; bin < to; bin++) sum += bins[bin] ?? 0;
        out[i] = sum / (to - from) / 255;
      });
    },
    destroy() {
      clearInterval(timer);
      clearTimeout(blockedTimer);
      decks.forEach((deck) => {
        deck.audio.pause();
        deck.audio.removeAttribute('src');
      });
      void ctx.close();
    },
  };
}

type Player = ReturnType<typeof createPlayer>;

export class Music {
  muted = $state(load(MUTED_KEY, (raw) => raw === '1', false));
  volume = $state(0);
  trackIndex = $state(0);
  failed = $state(false);
  blocked = $state(false);

  #tracks: Track[];
  #player: Player | null = null;

  constructor({ volume, tracks }: MusicConfig) {
    this.volume = load(VOLUME_KEY, parseVolume, volume);
    this.#tracks = tracks;
  }

  get available() {
    return this.#tracks.length > 0 && !this.failed;
  }

  get track(): Track | undefined {
    return this.#tracks[this.trackIndex];
  }

  setMuted(value: boolean) {
    this.muted = value;
    this.#player?.setMuted(value);
    save(MUTED_KEY, value ? '1' : '0');
  }

  toggleMuted() {
    this.setMuted(!this.muted);
  }

  setVolume(value: number) {
    this.volume = clampVolume(value);
    this.#player?.setVolume(this.volume);
    save(VOLUME_KEY, String(this.volume));
    this.setMuted(false);
  }

  readBands(out: number[]) {
    this.#player?.readBands(out);
  }

  start() {
    const [first, ...rest] = this.#tracks;
    if (!first) return () => {};

    const player = createPlayer([first, ...rest], {
      volume: this.volume,
      muted: this.muted,
      onTrack: (index) => (this.trackIndex = index),
      onError: () => (this.failed = true),
      onBlocked: (blocked) => (this.blocked = blocked),
    });

    const onMessage = (event: MessageEvent) => {
      if (event.data?.eventName === 'cobalt:shutdown') player.fadeOut();
    };

    const unlock = (event: Event) => {
      if (!this.blocked) return;

      if (!this.muted) event.stopPropagation();
      player.unlock();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.key.toLowerCase() !== 'm') return;

      this.toggleMuted();
    };

    this.#player = player;
    window.addEventListener('message', onMessage);
    window.addEventListener('click', unlock, true);
    window.addEventListener('keydown', unlock, true);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('click', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('keydown', onKeyDown);
      player.destroy();
      this.#player = null;
    };
  }
}
