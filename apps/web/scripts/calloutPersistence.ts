import fs from 'fs';
import path from 'path';

// Simple persistence helper: writes and reads a sample TipTap JSON content
export function writeSampleCallout() {
  const content = {
    type: 'doc',
    content: [
      {
        type: 'callout',
        attrs: { variant: 'warn' },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'This is a warning callout.' }] }],
      },
    ],
  } as any;

  const file = path.resolve(process.cwd(), 'tmp', 'callout-sample.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(content, null, 2), 'utf8');
  return file;
}

export function readSampleCallout() {
  const file = path.resolve(process.cwd(), 'tmp', 'callout-sample.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

if (require.main === module) {
  const f = writeSampleCallout();
  // eslint-disable-next-line no-console
  console.log('Wrote sample callout to', f);
}
