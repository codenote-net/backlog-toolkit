import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateConfig, makeRules } from './config.mjs';

const root = new URL('../', import.meta.url);
const demo = process.argv.includes('--demo');
const configUrl = new URL('config.local.json', root);
let config;
try {
  config = demo
    ? { origins: ['http://127.0.0.1:4173'], uploadPaths: ['/api/v2/space/attachment'], uploadSelectors: ['[data-upload-button]'] }
    : JSON.parse(await readFile(configUrl, 'utf8'));
  config = validateConfig(config, { demo });
} catch (error) {
  console.error(`${error.message}\nCopy config.example.json to config.local.json and set your space, or run npm run build:demo.`);
  process.exit(1);
}
const out = new URL(demo ? 'dist/demo/' : 'dist/backlog/', root);
await mkdir(out, { recursive: true });
const manifest = {
  manifest_version: 3,
  name: demo ? 'Backlog Toolkit — Local Demo' : 'Backlog Toolkit',
  version: '0.1.0',
  minimum_chrome_version: '101',
  description: 'Prevent accidental file uploads on configured Backlog spaces. Unofficial proof of concept.',
  permissions: ['declarativeNetRequestWithHostAccess', 'declarativeNetRequestFeedback'],
  background: { service_worker: 'background.js' },
  host_permissions: config.origins.map((origin) => `${new URL(origin).protocol}//${new URL(origin).hostname}/*`),
  content_scripts: [{
    matches: config.origins.map((origin) => `${new URL(origin).protocol}//${new URL(origin).hostname}/*`),
    js: ['config.js', 'content.js'],
    run_at: 'document_start',
    all_frames: true,
  }],
  declarative_net_request: {
    rule_resources: [{ id: 'upload_blocking', enabled: true, path: 'rules.json' }],
  },
};
await writeFile(new URL('manifest.json', out), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(new URL('rules.json', out), JSON.stringify(makeRules(config), null, 2) + '\n');
await writeFile(new URL('config.js', out), `globalThis.backlogToolkitConfig = ${JSON.stringify(config)};\n`);
await copyFile(new URL('src/content.js', root), new URL('content.js', out));
await copyFile(new URL('src/background.js', root), new URL('background.js', out));
console.log(`Load unpacked extension: ${fileURLToPath(out)}`);
