<script lang="ts">
  // "Certified Slopper", at the end of the author's name line, like one of
  // LinkedIn's own badges: this person is in your Hall of Slop, which takes a
  // real sample (several slop posts, most of what you've seen from them).
  // It sits inside the profile link, so clicks and hovers behave like the
  // name's. The controller picks data-fit (full, short, icon) from the room
  // the name leaves; the name never shrinks.
  import Sticker from './Sticker.svelte';
  import { UI } from './assets';
  import type { TagView } from './post-view.svelte';

  let { tag }: { tag: TagView } = $props();

  const about = $derived(
    `#${tag.rank} in your Hall of Slop · ${tag.title} · ${tag.slopPosts} of ${tag.postsSeen} posts you've seen were slop`,
  );
</script>

<span class="wrap">
  <span class="tag" title={about} aria-label="Certified Slopper: {about}">
    <Sticker class="crown" src={UI.crown()} emoji="👑" size={14} />
    <span class="full">Certified Slopper</span>
    <span class="short">Slopper</span>
  </span>
</span>
