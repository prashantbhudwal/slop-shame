<script lang="ts">
  // An asset image that falls back to an emoji when the art is missing.
  let {
    src,
    emoji,
    size = 24,
    alt = '',
    class: cls = '',
  }: { src: string; emoji: string; size?: number; alt?: string; class?: string } = $props();

  let failedSrc = $state<string | null>(null);
</script>

{#if failedSrc === src}
  <span
    class="emoji {cls}"
    style:width="{size}px"
    style:height="{size}px"
    style:font-size="{Math.round(size * 0.72)}px"
    role={alt ? 'img' : undefined}
    aria-label={alt || undefined}
    aria-hidden={alt ? undefined : 'true'}>{emoji}</span
  >
{:else}
  <img
    class={cls}
    {src}
    {alt}
    width={size}
    height={size}
    decoding="async"
    draggable="false"
    onerror={() => (failedSrc = src)}
  />
{/if}
