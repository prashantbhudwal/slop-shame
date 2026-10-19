/* Installed before navigation in BOTH runs. It never holds a removed DOM node strongly. */
(() => {
  const mountSelector = '[data-slop-shame-mount]';
  const longTasks = [];
  const frames = [];
  const measures = new Map();
  const removedMounts = [];
  const knownRemoved = new WeakSet();
  let recordingFrames = false;
  let previousFrame = null;
  let observedUi = false;
  let observer;
  let longTasksSupported = false;

  function weaklyRemember(node) {
    if (!(node instanceof Element)) return;
    const mounts = node.matches(mountSelector) ? [node] : node.querySelectorAll(mountSelector);
    for (const mount of mounts) {
      if (knownRemoved.has(mount)) continue;
      knownRemoved.add(mount);
      removedMounts.push(new WeakRef(mount));
    }
  }

  const mutationObserver = new MutationObserver(records => {
    for (const record of records) for (const removed of record.removedNodes) weaklyRemember(removed);
  });
  mutationObserver.observe(document, { childList: true, subtree: true });
  try {
    observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        longTasks.push({
          startTime: entry.startTime, duration: entry.duration, name: entry.name,
          attribution: (entry.attribution || []).map(item => ({
            name: item.name, containerType: item.containerType,
            containerName: item.containerName, containerSrc: item.containerSrc,
          })),
        });
      }
    });
    observer.observe({ type: 'longtask', buffered: true });
    longTasksSupported = true;
  } catch { /* Surfaced as unsupported in the report, never a fabricated zero. */ }
  const markObserver = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      if (!entry.name.startsWith('slop:')) continue;
      const value = measures.get(entry.name) || { name: entry.name, entryType: entry.entryType, count: 0, totalMs: 0, maxMs: 0 };
      value.count++;
      value.totalMs += entry.duration;
      value.maxMs = Math.max(value.maxMs, entry.duration);
      measures.set(entry.name, value);
      // The extension owns its timeline. Clearing marks here could break a later
      // measure(start, end), or hide an extension-side timeline retention bug.
    }
  });
  markObserver.observe({ entryTypes: ['mark', 'measure'] });

  function raf(now) {
    if (recordingFrames && previousFrame !== null) frames.push(now - previousFrame);
    previousFrame = recordingFrames ? now : null;
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  function hasUi(mount) {
    const root = mount.shadowRoot || mount;
    return [...root.children].some(child => !['STYLE', 'LINK', 'SCRIPT'].includes(child.tagName));
  }
  function uiStats() {
    const posts = [...document.querySelectorAll('[data-perf-post]')];
    const mounts = [...document.querySelectorAll(mountSelector)];
    const active = mounts.filter(hasUi);
    observedUi ||= active.length > 0;
    let duplicateMounts = 0;
    let visiblePosts = 0;
    let visibleWithUi = 0;
    for (const post of posts) {
      const hosts = [...post.querySelectorAll(mountSelector)];
      duplicateMounts += Math.max(0, hosts.length - 1);
      const rect = post.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < innerHeight) {
        visiblePosts++;
        if (hosts.some(hasUi)) visibleWithUi++;
      }
    }
    return {
      posts: posts.length, mounts: mounts.length, uiInstances: active.length,
      shadowHosts: mounts.filter(mount => mount.shadowRoot).length,
      orphanMounts: mounts.filter(mount => !mount.closest('[data-perf-post]')).length,
      duplicateMounts, visiblePosts, visibleWithUi, observedUi,
    };
  }
  window.__perfMetrics = {
    recordFrames(value) { recordingFrames = value; previousFrame = null; },
    uiStats,
    detachedProxy() {
      let retained = 0;
      for (const weak of removedMounts) {
        const node = weak.deref();
        if (node && !node.isConnected) retained++;
      }
      return { retained, removedMountsObserved: removedMounts.length };
    },
    result: () => ({ longTasks, longTasksSupported, frames, marks: [...measures.values()], ui: uiStats() }),
  };
})();
