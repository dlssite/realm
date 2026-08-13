import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

const slashItems = (query = '') => {
  const items = [
    { title: 'Heading 1', command: (editor: any) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { title: 'Heading 2', command: (editor: any) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { title: 'Callout', command: (editor: any) => editor.chain().focus().insertContent({ type: 'callout', content: [{ type: 'paragraph' }] }).run() },
    { title: 'Code block', command: (editor: any) => editor.chain().focus().toggleCodeBlock().run() },
    { title: 'Quote', command: (editor: any) => editor.chain().focus().toggleBlockquote().run() },
    { title: 'Bullet list', command: (editor: any) => editor.chain().focus().toggleBulletList().run() },
  ];

  if (!query) return items;
  return items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()));
};

const SlashCommand = Extension.create({
  name: 'slash-command',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: true,
        command: ({ editor, range, props }: any) => {
          props.command(editor);
          editor.commands.focus();
        },
        items: ({ query }: any) => {
          return slashItems(query);
        },
        render: () => {
          let popup: HTMLElement | null = null;
          let selected = 0;

          return {
            onStart: (props: any) => {
              popup = document.createElement('div');
              popup.className = 'slash-suggestion';
              update(props);
              document.body.appendChild(popup);
            },
            onUpdate: (props: any) => update(props),
            onKeyDown: (props: any) => {
              const event = props.event as KeyboardEvent;
              const items = slashItems(props.query);
              if (!items.length) return false;

              if (event.key === 'ArrowDown') {
                selected = Math.min(selected + 1, Math.max(0, Math.min(items.length - 1, 5)));
                update(props);
                return true;
              }

              if (event.key === 'ArrowUp') {
                selected = Math.max(selected - 1, 0);
                update(props);
                return true;
              }

              if (event.key === 'Enter') {
                const item = items[selected];
                if (item) {
                  props.command(item);
                  return true;
                }
                return false;
              }

              if (event.key === 'Escape') {
                props.command({ id: 'close' });
                return true;
              }

              return false;
            },
            onExit: () => {
              if (popup && popup.parentNode) popup.parentNode.removeChild(popup);
              popup = null;
              selected = 0;
            },
          };

          function update(props: any) {
            if (!popup) return;
            const items = slashItems(props.query);
            popup.innerHTML = '';
            items.slice(0, 6).forEach((item, idx) => {
              const el = document.createElement('div');
              el.className = 'suggestion-item';
              if (idx === selected) el.classList.add('selected');
              el.textContent = item.title;
              el.onclick = () => props.command(item);
              popup!.appendChild(el);
            });

            const rect = props.clientRect();
            if (rect) {
              const { left, top } = rect;
              if (typeof left === 'number' && typeof top === 'number') {
                popup.style.position = 'absolute';
                popup.style.left = `${left}px`;
                popup.style.top = `${top + 24}px`;
                popup.style.zIndex = '9999';
              }
            }
          }
        },
      },
    };
  },
  addProseMirrorPlugins() {
    if (!this.editor) return [];

    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export default SlashCommand;
