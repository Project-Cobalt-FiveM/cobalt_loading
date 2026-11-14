<script lang="ts">
  import { onMount } from 'svelte';
  import AudioControl from './components/AudioControl.svelte';
  import { config } from './lib/config';
  import { STAGES, type StageIndex } from './lib/loading';
  import { t } from './lib/locale';
  import { reducedMotion } from './lib/motion';
  import { Music } from './lib/music.svelte';
  import { progress } from './lib/progress.svelte';

  const TIP_INTERVAL = 6000;
  const FADE_MS = 200;

  const music = new Music(config.music);

  let shownProgress = $state(progress.state.progress);
  let tipIndex = $state(0);
  let tipVisible = $state(true);

  const load = $derived(progress.state);
  const tip = $derived(config.tips[tipIndex] ?? config.tips[0]);

  onMount(() => music.start());

  $effect(() => {
    const target = load.progress;

    if (reducedMotion()) {
      shownProgress = target;
      return;
    }

    let frame = 0;
    const step = () => {
      const gap = target - shownProgress;
      shownProgress = Math.abs(gap) < 0.0005 ? target : shownProgress + gap * 0.12;

      if (shownProgress !== target) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    if (config.tips.length < 2) return;

    let swap = 0;
    const next = () => (tipIndex = (tipIndex + 1) % config.tips.length);

    const timer = setInterval(() => {
      if (reducedMotion()) {
        next();
        return;
      }

      tipVisible = false;
      swap = window.setTimeout(() => {
        next();
        tipVisible = true;
      }, FADE_MS);
    }, TIP_INTERVAL);

    return () => {
      clearInterval(timer);
      clearTimeout(swap);
    };
  });

  function stageLabelClass(index: number, current: StageIndex) {
    if (index < current) return 'font-medium text-muted-foreground';
    if (index === current) return 'font-semibold text-foreground';
    return 'font-medium text-neutral-600';
  }
</script>

<main
  class="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-background font-sans text-foreground antialiased"
>
  <div class="flex flex-col items-center gap-[0.75rem]">
    <img src="./owl.png" alt="" class="h-[20.625rem] w-[28.75rem] shrink-0 object-cover" />
    <h1 class="text-[3rem] leading-[3.5rem] font-semibold tracking-[-0.02em]">{config.serverName}</h1>
    <p class="text-[1.0625rem] leading-[1.625rem] text-muted-foreground">{t('loading.tagline')}</p>
  </div>

  <section class="flex w-[45rem] flex-col gap-[0.875rem] pt-[3rem]" aria-label={t('loading.progress')}>
    <div class="flex items-end justify-between">
      <div class="flex flex-col gap-[0.125rem]">
        <span class="text-[0.8125rem] leading-[1rem] font-medium text-neutral-500">{load.task}</span>
        <span class="text-[1rem] leading-[1.5rem] font-medium tabular-nums">{load.detail}</span>
      </div>
      <span class="text-[3.5rem] leading-[3.5rem] font-semibold tracking-[-0.03em] tabular-nums">
        {Math.floor(shownProgress * 100)}%
      </span>
    </div>

    <div
      class="grid grid-cols-4 gap-[0.375rem]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.floor(load.progress * 100)}
    >
      {#each load.fill as fill}
        <div class="h-[0.5rem] overflow-hidden rounded-full bg-secondary">
          <div
            class="h-full rounded-full bg-cobalt transition-[width] duration-300 ease-cobalt motion-reduce:transition-none"
            style:width="{fill * 100}%"
          ></div>
        </div>
      {/each}
    </div>

    <ol class="grid grid-cols-4 gap-[0.375rem] text-[0.8125rem] leading-[1rem]">
      {#each STAGES as stage, i}
        <li class={stageLabelClass(i, load.stage)}>{stage}</li>
      {/each}
    </ol>
  </section>

  <footer class="absolute inset-x-[6rem] bottom-[4rem] flex items-center">
    <p
      class="flex flex-1 basis-0 items-center gap-[0.625rem] transition-opacity duration-200 ease-cobalt motion-reduce:transition-none"
      style:opacity={tipVisible ? 1 : 0}
    >
      {#if tip.key}
        <kbd
          class="rounded-[0.25rem] border border-border bg-muted px-[0.5rem] py-[0.25rem] font-sans text-[0.8125rem] leading-[1rem] font-medium"
        >
          {tip.key}
        </kbd>
      {/if}
      <span class="text-[0.9375rem] leading-[1.375rem] text-muted-foreground">{t(`tips.${tip.id}`)}</span>
    </p>

    {#if music.available}
      <AudioControl {music} />
    {/if}

    <div class="flex flex-1 basis-0 items-center justify-end gap-[0.875rem]">
      <img src="./cobalt-mark.svg" alt="" class="size-[2.25rem] shrink-0" />
      <span class="text-[1.25rem] leading-[1.5rem] font-semibold tracking-[-0.02em]">Cobalt</span>
    </div>
  </footer>
</main>
