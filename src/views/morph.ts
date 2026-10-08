import morphdom from 'morphdom';

/**
 * Updates `el`'s children to match `html`, changing only what differs.
 * Elements that stay keep running their CSS animations, and class changes animate instead of popping.
 * An element with a different `data-key` is replaced, so it plays its enter animation again.
 */
export function morphChildren(el: HTMLElement, html: string): void {
  morphdom(el, `<div>${html}</div>`, {
    childrenOnly: true,
    getNodeKey: (node) => (node instanceof Element ? (node.getAttribute('data-key') ?? (node.id || undefined)) : undefined),
  });
}
