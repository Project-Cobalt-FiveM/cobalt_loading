<script lang="ts">
  import type { Snippet } from 'svelte';
  import SpeakerHigh from 'phosphor-svelte/lib/SpeakerHigh';
  import SpeakerLow from 'phosphor-svelte/lib/SpeakerLow';
  import SpeakerNone from 'phosphor-svelte/lib/SpeakerNone';
  import SpeakerX from 'phosphor-svelte/lib/SpeakerX';
  import { t } from '../lib/locale';
  import type { Music } from '../lib/music.svelte';
  import Meter from './Meter.svelte';
  import VolumePopover from './VolumePopover.svelte';

  const VOLUME_STEP = 0.05;

  const STATUS = {
    muted: { title: t('music.muted.title'), hint: t('music.muted.hint'), action: t('music.muted.action') },
    blocked: { title: t('music.blocked.title'), hint: t('music.blocked.hint'), action: t('music.blocked.action') },
  } as const;

  let { music }: { music: Music } = $props();

  let hovered = $state(false);
  let popoverOpen = $state(false);

  const status = $derived(music.muted ? STATUS.muted : music.blocked ? STATUS.blocked : null);
  const action = $derived(status?.action ?? t('music.mute'));
  const Speaker = $derived(
    music.muted ? SpeakerX : music.volume === 0 ? SpeakerNone : music.volume < 0.2 ? SpeakerLow : SpeakerHigh,
  );

  $effect(() => {
    if (!popoverOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') popoverOpen = false;
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });
</script>

{#snippet floating(open: boolean, children: Snippet)}
  <div
    class="absolute bottom-full left-0 pb-[0.5rem] transition-[opacity,transform] duration-150 ease-cobalt motion-reduce:transition-none {open
      ? 'translate-y-0 opacity-100'
      : 'pointer-events-none translate-y-[0.25rem] opacity-0'}"
  >
    {@render children()}
  </div>
{/snippet}

{#snippet tooltip()}
  <div
    role="tooltip"
    class="flex items-center gap-[0.5rem] rounded-[0.375rem] border border-border bg-popover px-[0.5rem] py-[0.375rem] whitespace-nowrap"
  >
    <span class="text-[0.75rem] leading-[1rem] font-medium">{action}</span>
    <kbd
      class="rounded-[3px] bg-secondary px-[0.3125rem] py-px font-sans text-[0.6875rem] leading-[0.875rem] font-medium text-muted-foreground"
    >
      M
    </kbd>
  </div>
{/snippet}

{#snippet volume()}
  <VolumePopover open={popoverOpen} volume={music.volume} onchange={(value) => music.setVolume(value)} />
{/snippet}

<div class="flex items-center gap-[0.75rem]">
  <div class="relative" role="group" onmouseleave={() => (popoverOpen = false)}>
    {@render floating(hovered && !popoverOpen, tooltip)}
    {@render floating(popoverOpen, volume)}

    <button
      type="button"
      onclick={() => music.toggleMuted()}
      oncontextmenu={(event) => {
        event.preventDefault();
        popoverOpen = true;
      }}
      onwheel={(event) => {
        popoverOpen = true;
        music.setVolume(music.volume + (event.deltaY < 0 ? VOLUME_STEP : -VOLUME_STEP));
      }}
      onmouseenter={() => (hovered = true)}
      onmouseleave={() => (hovered = false)}
      aria-pressed={music.muted}
      aria-label={action}
      class="flex size-[2.25rem] items-center justify-center rounded-[0.375rem] border border-border bg-muted transition-colors duration-150 ease-cobalt hover:border-neutral-700 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-muted-foreground focus-visible:outline-none {status
        ? 'text-muted-foreground'
        : 'text-foreground'}"
    >
      <Speaker weight="fill" class="size-[1.125rem]" aria-hidden="true" />
    </button>
  </div>

  <Meter flat={status !== null} readBands={(out) => music.readBands(out)} />

  <div class="flex flex-col" aria-live="polite">
    {#if status}
      <span class="text-[0.875rem] leading-[1.125rem] font-medium text-muted-foreground">{status.title}</span>
      <span class="text-[0.75rem] leading-[1rem] text-neutral-500">{status.hint}</span>
    {:else if music.track}
      <span class="text-[0.875rem] leading-[1.125rem] font-medium">{music.track.title}</span>
      <span class="text-[0.75rem] leading-[1rem] text-neutral-500">{music.track.artist}</span>
    {/if}
  </div>

  <kbd
    class="rounded-[0.25rem] border border-border bg-muted px-[0.5rem] py-[0.25rem] font-sans text-[0.8125rem] leading-[1rem] font-medium"
  >
    M
  </kbd>
</div>
