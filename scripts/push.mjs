#!/usr/bin/env node
/**
 * Automated build, commit, and non-interactive push to GitHub (arpitkumar81008-cmd/family-tree).
 * Usage: npm run push -- "feat: my commit message"
 */
import { execSync } from 'node:child_process';

const GITHUB_OWNER = 'arpitkumar81008-cmd';
const GITHUB_REPO = 'family-tree';
const EXPECTED_REMOTE = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git`;

const msg =
  process.argv.slice(2).join(' ').trim() ||
  `chore: sync family tree (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`;

const run = (cmd, opts = {}) =>
  execSync(cmd, {
    stdio: 'inherit',
    ...opts
  });

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

console.log('3/3 Verifying remote repository & pushing to GitHub (origin/main)...');
const checkRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, {
  headers: { 'User-Agent': 'family-tree-push-script' }
});

let repoReady = checkRes.status !== 404;

if (!repoReady) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    console.log(`Creating public repository ${GITHUB_OWNER}/${GITHUB_REPO} via GitHub API...`);
    const createRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'family-tree-push-script',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: GITHUB_REPO,
        description: 'Gupta Family Tree — Interactive Bilingual Heritage & Genealogy Platform',
        private: false
      })
    });
    if (createRes.ok) {
      repoReady = true;
    } else {
      console.error(`Failed to auto-create repository (${createRes.status}).`);
      process.exitCode = 1;
    }
  } else {
    console.log(
      `\n[Action Needed] The repository https://github.com/${GITHUB_OWNER}/${GITHUB_REPO} does not exist on GitHub yet (HTTP 404).\n` +
        `1. Open https://github.com/new?name=${GITHUB_REPO}&visibility=public (signed in as ${GITHUB_OWNER}) and click "Create repository" (leave "Add a README" unchecked).\n` +
        `2. Re-run: npm run push\n`
    );
  }
}

if (repoReady) {
  run('git push -u origin main');
  console.log(`Successfully pushed to https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`);
}
