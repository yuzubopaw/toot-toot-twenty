import { spawn } from 'node:child_process';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', args, { cwd: root, stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npx ${args.join(' ')} exited ${code}`));
    });
  });
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await run(['vite', 'build', '--outDir', 'dist/ttt', '--emptyOutDir']);
await run([
  'vite',
  'build',
  '--config',
  'jump-jump-bunny/vite.config.js',
  '--outDir',
  path.join(dist, 'jjb'),
  '--emptyOutDir',
]);
await cp(path.join(root, 'site/index.html'), path.join(dist, 'index.html'));
await cp(path.join(root, 'site/gate.css'), path.join(dist, 'gate.css'));
await cp(path.join(root, 'site/favicon.svg'), path.join(dist, 'favicon.svg'));
