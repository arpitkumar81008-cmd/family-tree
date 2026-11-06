#!/usr/bin/env node
/**
 * Automated build, commit, and non-interactive push to GitHub (arpitkumar81008-cmd/family-tree).
 * Usage: npm run push -- "feat: my commit message"
 */
import { execSync } from 'node:child_process';

const EXPECTED_REMOTE = 'https://github.com/arpitkumar81008-cmd/family-tree.git';
const msg =
  process.argv.slice(2).join(' ').trim() ||
  `chore: sync family tree (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`;

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });

try {
  const currentRemote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  if (currentRemote !== EXPECTED_REMOTE) {
    console.log(`Updating origin remote -> ${EXPECTED_REMOTE}`);
    run(`git remote set-url origin ${EXPECTED_REMOTE}`);
  }
} catch {
  run(`git remote add origin ${EXPECTED_REMOTE}`);
}

console.log('1/3 Building production bundle...');
run('npm run build');

console.log('2/3 Staging & committing changes...');
run('git add -A');
try {
  run(`git commit -m ${JSON.stringify(msg)}`);
} catch {
  console.log('No new file changes to commit; pushing existing commits...');
}

console.log('3/3 Pushing to GitHub (origin/main)...');
run('git push -u origin main');
console.log('Successfully pushed to https://github.com/arpitkumar81008-cmd/family-tree');
