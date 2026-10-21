/** Indexed min-heap: queueing, removal and draining never scan the backlog. */
export interface PendingPost {
  root: HTMLElement;
  due: number;
  force: boolean;
  index: number;
  order: number;
}

export class PendingPosts {
  private readonly byRoot = new Map<HTMLElement, PendingPost>();
  private readonly heap: PendingPost[] = [];
  private order = 0;

  get size() { return this.heap.length; }
  peek() { return this.heap[0]; }

  add(root: HTMLElement, due: number, force: boolean) {
    const existing = this.byRoot.get(root);
    if (existing) { existing.force ||= force; return; }
    const work = { root, due, force, index: this.heap.length, order: this.order++ };
    this.byRoot.set(root, work);
    this.heap.push(work);
    this.up(work.index);
  }

  delete(root: HTMLElement) {
    const work = this.byRoot.get(root);
    if (!work) return;
    this.byRoot.delete(root);
    const last = this.heap.pop()!;
    if (last === work) return;
    this.heap[work.index] = last;
    last.index = work.index;
    this.up(last.index);
    this.down(last.index);
  }

  clear() { this.byRoot.clear(); this.heap.length = 0; }

  private before(a: PendingPost, b: PendingPost) {
    return a.due < b.due || (a.due === b.due && a.order < b.order);
  }

  private swap(a: number, b: number) {
    const first = this.heap[a]!, second = this.heap[b]!;
    this.heap[a] = second; second.index = a;
    this.heap[b] = first; first.index = b;
  }

  private up(index: number) {
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (!this.before(this.heap[index]!, this.heap[parent]!)) break;
      this.swap(index, parent); index = parent;
    }
  }

  private down(index: number) {
    while (index * 2 + 1 < this.heap.length) {
      let next = index * 2 + 1;
      if (next + 1 < this.heap.length && this.before(this.heap[next + 1]!, this.heap[next]!)) next++;
      if (!this.before(this.heap[next]!, this.heap[index]!)) break;
      this.swap(index, next); index = next;
    }
  }
}
