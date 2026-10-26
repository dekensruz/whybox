// Compiles the scene kit (2D, and 3D with three.js) into self-contained scripts that the app injects
// into each generated experiment: import kit2d from 'virtual:whybox-kit-2d' gives the script as a string.
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import type { Plugin } from 'vite';

const PREFIX = 'virtual:whybox-kit-';
const KIT_DIR = path.resolve('src/features/lesson/runtime/kit');
const ENTRIES: Record<string, string> = { '2d': 'entry2d.js', '3d': 'entry3d.js' };

export const kitBundles = (): Plugin => ({
  name: 'whybox-kit-bundles',
  resolveId(id) {
    return id.startsWith(PREFIX) ? `\0${id}` : null;
  },
  async load(id) {
    if (!id.startsWith(`\0${PREFIX}`)) return null;
    const entry = ENTRIES[id.slice(PREFIX.length + 1)];
    if (!entry) throw new Error(`Unknown kit bundle ${id}`);
    // Rebuild the bundle when any kit file changes.
    readdirSync(KIT_DIR).forEach((file) => this.addWatchFile(path.join(KIT_DIR, file)));
    const result = await build({
      entryPoints: [path.join(KIT_DIR, entry)],
      bundle: true,
      format: 'iife',
      minify: true,
      target: 'es2019',
      write: false,
      legalComments: 'none',
    });
    // Inside an inline <script>, "</script" would end the element early.
    const source = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
    return `export default ${JSON.stringify(source)};`;
  },
});
