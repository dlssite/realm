const fs = require('fs');
const path = require('path');

function writeSampleCallout() {
  const content = {
    type: 'doc',
    content: [
      {
        type: 'callout',
        attrs: { variant: 'warn' },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'This is a warning callout.' }] }],
      },
    ],
  };

  const file = path.resolve(process.cwd(), 'tmp', 'callout-sample.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(content, null, 2), 'utf8');
  return file;
}

function readSampleCallout() {
  const file = path.resolve(process.cwd(), 'tmp', 'callout-sample.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

if (require.main === module) {
  const f = writeSampleCallout();
  console.log('Wrote sample callout to', f);
  const content = readSampleCallout();
  console.log('Read back content:', JSON.stringify(content, null, 2));
}

module.exports = { writeSampleCallout, readSampleCallout };
