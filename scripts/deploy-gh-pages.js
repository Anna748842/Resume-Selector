const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "client", "dist");
const worktreeDir = path.resolve(rootDir, "..", "resume-selector-gh-pages");

function run(command, options = {}) {
  execSync(command, {
    cwd: rootDir,
    stdio: "inherit",
    shell: true,
    ...options
  });
}

function cleanDirectory(targetDir) {
  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    const fullPath = path.join(targetDir, entry.name);

    if (entry.name === ".git") {
      continue;
    }

    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

function ensureWorktree() {
  if (fs.existsSync(worktreeDir)) {
    fs.rmSync(worktreeDir, { recursive: true, force: true });
  }
}

function copyDistToWorktree() {
  const rootEntries = fs.readdirSync(distDir, { withFileTypes: true });

  for (const entry of rootEntries) {
    const src = path.join(distDir, entry.name);
    const destination = path.join(worktreeDir, entry.name);
    fs.cpSync(src, destination, { recursive: true, force: true });
  }
}

try {
  if (!fs.existsSync(distDir)) {
    throw new Error("Build output not found. Run npm run build first.");
  }

  run('git config user.name "GitHub Pages Deploy"');
  run('git config user.email "deploy@github.local"');

  ensureWorktree();

  try {
    run('git rev-parse --verify gh-pages');
    run(`git worktree add --force "${worktreeDir}" gh-pages`);
  } catch (error) {
    run(`git worktree add --force -B gh-pages "${worktreeDir}" HEAD`);
  }

  cleanDirectory(worktreeDir);
  copyDistToWorktree();

  fs.writeFileSync(path.join(worktreeDir, ".nojekyll"), "");

  run(`git -C "${worktreeDir}" add -A`);
  run(`git -C "${worktreeDir}" status --short`);

  try {
    run(`git -C "${worktreeDir}" commit -m "Deploy GitHub Pages"`);
  } catch (error) {
    console.log("No files changed; deployment commit not created.");
  }

  run(`git -C "${worktreeDir}" push -u origin gh-pages`);
  console.log("Deployment pushed to GitHub Pages branch.");
} catch (error) {
  console.error("GitHub Pages deployment failed:", error.message);
  process.exit(1);
}
