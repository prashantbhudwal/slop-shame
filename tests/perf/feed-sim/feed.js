/* Browser-only fixture. LinkedIn hooks here are synthetic markup, never live-site queries. */
(async () => {
  const params = new URLSearchParams(location.search);
  const total = Number(params.get('posts') || 2000);
  const seed = Number(params.get('seed') || 20261019) >>> 0;
  const batch = Number(params.get('batch') || 10);
  const windowSize = Number(params.get('window') || 30);
  const slotHeight = Number(params.get('slot') || 440);
  const corpus = await fetch('/__perf__/corpus.json').then(response => response.json());
  const human = corpus.filter(post => !post.sloppy);
  const sloppy = corpus.filter(post => post.sloppy);
  const feed = document.getElementById('perf-feed');
  const top = document.getElementById('perf-top-spacer');
  const bottom = document.getElementById('perf-bottom-spacer');
  const output = document.getElementById('perf-progress');
  document.documentElement.style.setProperty('--slot-height', `${slotHeight}px`);
  const live = new Map();
  const visited = new Set();
  let generated = 0;
  let removed = 0;
  let recycled = 0;
  let paused = false;
  let first = 0;

  function randomFor(index) {
    let state = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let t = Math.imul(state ^ state >>> 15, state | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const avatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="42" height="42"%3E%3Crect width="42" height="42" fill="%2399a"/%3E%3C/svg%3E';
  const names = ['Ada Patel', 'Ben Okafor', 'Chloe Reed', 'Dev Rao', 'Elena Martin', 'Farah Khan'];
  function fill(shell, index) {
    const random = randomFor(index);
    const isSloppy = index % 2 === 1;
    const pool = isSloppy ? sloppy : human;
    const source = pool[Math.floor(random() * pool.length)];
    const targetWords = 50 + Math.floor(random() * 351);
    const words = source.text.trim().split(/\s+/u);
    const textWords = [];
    while (textWords.length < targetWords) textWords.push(...words.slice(0, targetWords - textWords.length));
    const name = names[index % names.length];
    const authorId = index % 137;
    const opaque = `perf_${seed.toString(36)}_${index.toString(36)}_Z8m`;
    shell.className = 'f91c3';
    shell.dataset.perfPost = String(index);
    shell.setAttribute('componentkey', `expanded${opaque}FeedType_MAIN_FEED_RELEVANCE`);
    shell.innerHTML = `<div role="listitem" componentkey="update-card-focus${opaque}FeedType_MAIN_FEED_RELEVANCE"><div data-view-name="feed-full-update" class="a72de"><p class="c87d2"></p><div class="b18fa"><a data-view-name="feed-actor-image" href="/in/perf-author-${authorId}/"><img alt="" src='${avatar}'></a><div><a data-view-name="feed-actor" href="/in/perf-author-${authorId}/"><p></p></a><p class="c87d2"></p><p class="c87d2">2h · Edited</p></div></div><p class="d64ef" data-view-name="feed-commentary"></p><div class="e32ab"><button>Like</button><button>Comment</button><button>Repost</button><button>Send</button></div></div></div>`;
    shell.querySelector('.b18fa a[data-view-name="feed-actor"] p').textContent = `${name} ${authorId}`;
    shell.querySelector('.b18fa div > .c87d2').textContent = source.authorHeadline || (isSloppy ? 'Visionary | Thought Leader | 10x Founder 🚀' : 'Engineer at Example Workshop');
    shell.querySelector('.d64ef').textContent = textWords.join(' ');
    const social = shell.querySelector('.a72de > .c87d2');
    if (index % 3 === 0) {
      const anchor = document.createElement('span');
      anchor.setAttribute('data-sdui-anchor-id', `feed-header-urn:li:activity:${7600000000000000000n + BigInt(seed) * 10000n + BigInt(index)}-0`);
      anchor.textContent = 'A colleague likes this';
      social.append(anchor);
    } else social.textContent = 'Suggested for you';
    return shell;
  }

  function render() {
    if (paused) return;
    const offset = Math.max(0, scrollY - 76);
    const visibleFirst = Math.min(total - 1, Math.floor(offset / slotHeight));
    const visibleLast = Math.min(total - 1, Math.floor((offset + innerHeight) / slotHeight));
    first = Math.max(0, Math.min(total - windowSize, Math.floor((visibleFirst - 5) / batch) * batch));
    const end = Math.min(total, first + windowSize);
    // Advance the synthetic lazy loader in batches of ten; data is generated on demand.
    while (generated < end) generated = Math.min(total, generated + batch);
    const pool = [];
    for (const [index, node] of live) {
      if (index < first || index >= end) {
        node.remove();
        node.replaceChildren(); // The simulator must not retain old extension hosts.
        live.delete(index);
        removed++;
        if (pool.length < batch) pool.push(node);
      }
    }
    for (let index = first; index < end; index++) {
      if (live.has(index)) continue;
      const reused = pool.pop();
      if (reused) recycled++;
      const node = fill(reused || document.createElement('div'), index);
      live.set(index, node);
      const next = [...live].filter(([n]) => n > index).sort(([a], [b]) => a - b)[0]?.[1];
      feed.insertBefore(node, next || null);
    }
    top.style.height = `${first * slotHeight}px`;
    // Unloaded posts have only a height estimate, as in a virtual list.
    bottom.style.height = `${(total - end) * slotHeight}px`;
    for (let i = visibleFirst; i <= visibleLast; i++) visited.add(i);
    output.textContent = `${visited.size}/${total} seen · ${live.size} live · ${removed} removed`;
  }

  let scheduled = false;
  addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; render(); });
  }, { passive: true });
  window.__perfFeed = {
    ready: true,
    render,
    pause(value) { paused = value; },
    stats: () => ({ total, generated, removed, recycled, first, live: live.size, visited: visited.size }),
    async scrollToPost(index, pixelsPerSecond) {
      const target = Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, 76 + index * slotHeight));
      const direction = Math.sign(target - scrollY);
      let last = performance.now();
      await new Promise(resolve => {
        function step(now) {
          // Clamp a stall's catch-up distance so every post still enters the viewport.
          const stepPx = Math.min(slotHeight / 2, pixelsPerSecond * Math.min(50, now - last) / 1000);
          last = now;
          const next = scrollY + direction * stepPx;
          if (!direction || direction * (target - next) <= 0) {
            scrollTo(0, target);
            render();
            requestAnimationFrame(() => resolve());
            return;
          }
          scrollTo(0, next);
          requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    },
    async returnToTop() {
      scrollTo(0, 0);
      render();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    },
  };
  render();
})();
