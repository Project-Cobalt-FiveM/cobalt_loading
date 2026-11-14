<script lang="ts">
  import { reducedMotion, rem } from '../lib/motion';

  const STATIC_BARS = [8, 14, 10];
  const FULL_HEIGHT = 14;
  const RANGE_DRIFT = 0.002;
  const MIN_RANGE = 0.05;

  let { flat, readBands }: { flat: boolean; readBands: (out: number[]) => void } = $props();

  const bars: HTMLDivElement[] = $state([]);

  $effect(() => {
    if (flat) return;

    const setHeights = (heights: number[]) => {
      bars.forEach((bar, i) => (bar.style.transform = `scaleY(${(heights[i] ?? 3) / FULL_HEIGHT})`));
    };

    if (reducedMotion()) {
      setHeights(STATIC_BARS);
      return;
    }

    const levels = [0, 0, 0];
    const floors = [1, 1, 1];
    const ceilings = [0, 0, 0];
    let frame = 0;

    const draw = () => {
      readBands(levels);
      setHeights(
        levels.map((level, i) => {
          const floor = Math.min(level, (floors[i] ?? 1) + RANGE_DRIFT);
          const ceiling = Math.max(level, (ceilings[i] ?? 0) - RANGE_DRIFT, floor + MIN_RANGE);
          floors[i] = floor;
          ceilings[i] = ceiling;
          return 3 + ((level - floor) / (ceiling - floor)) * 11;
        }),
      );

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  });
</script>

<div class="flex h-[0.875rem] items-end gap-[0.125rem]" aria-hidden="true">
  {#each STATIC_BARS as height, i (i)}
    <div
      bind:this={bars[i]}
      class="w-[0.1875rem] origin-bottom rounded-[1px] {flat ? 'bg-neutral-700' : 'bg-muted-foreground'}"
      style:height={rem(FULL_HEIGHT)}
      style:transform="scaleY({(flat ? 3 : height) / FULL_HEIGHT})"
    ></div>
  {/each}
</div>
