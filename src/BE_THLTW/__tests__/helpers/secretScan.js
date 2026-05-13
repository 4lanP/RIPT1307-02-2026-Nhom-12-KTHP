const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '../../../..');

function getTrackedFiles() {
  const output = execFileSync('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return output.split(/\r?\n/).filter(Boolean);
}

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function findTrackedEnvFiles() {
  return getTrackedFiles().filter((file) => /(^|\/)\.env(\.|$)/.test(file) && !file.endsWith('.env.example'));
}

module.exports = {
  repoRoot,
  getTrackedFiles,
  readRepoFile,
  findTrackedEnvFiles,
};
