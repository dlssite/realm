import { Node as TipTapNode, mergeAttributes } from '@tiptap/core';

const Callout = TipTapNode.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  selectable: true,
  addOptions() {
    return { HTMLAttributes: {} };
  },
  addAttributes() {
    return { variant: { default: 'info' } };
  },
  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },
  renderHTML({ HTMLAttributes }: any) {
    const variant = HTMLAttributes.variant || this.options.variant || 'info';
    const className = `callout callout--${variant}`;
    return [
      'div',
      mergeAttributes({ 'data-callout': variant, class: className }, this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
  addCommands() {
    return {
      toggleCallout:
        () =>
        ({ commands }: any) => {
          return commands.toggleNode('callout', 'paragraph');
        },
    } as any;
  },
});

export default Callout;
