<script lang="ts">
  import { t } from '../lib/locale';

  let { open, volume, onchange }: { open: boolean; volume: number; onchange: (value: number) => void } = $props();

  const thumbCentre = $derived(`calc(${volume} * (100% - 0.75rem) + 0.375rem)`);
</script>

<div
  class="flex w-[12.5rem] items-center gap-[0.625rem] rounded-lg border border-border bg-popover px-[0.75rem] py-[0.625rem]"
>
  <div class="group relative flex h-[0.75rem] flex-1 items-center">
    <div class="h-[0.25rem] w-full rounded-full bg-secondary"></div>
    <div class="absolute left-0 h-[0.25rem] rounded-full bg-foreground" style:width={thumbCentre}></div>
    <div
      class="absolute size-[0.75rem] -translate-x-1/2 rounded-full bg-foreground ring-muted-foreground group-has-[:focus-visible]:ring-2"
      style:left={thumbCentre}
    ></div>
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={volume}
      oninput={(event) => onchange(Number(event.currentTarget.value))}
      aria-label={t('music.volume')}
      tabindex={open ? 0 : -1}
      class="absolute inset-0 w-full cursor-pointer opacity-0"
    />
  </div>
  <span class="w-[1.75rem] text-right text-[0.75rem] leading-[1rem] font-medium text-muted-foreground tabular-nums">
    {Math.round(volume * 100)}%
  </span>
</div>
