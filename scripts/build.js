const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const distRoot = path.join(root, "dist");
const targets = {
  chrome: "manifest.chrome.json",
  firefox: "manifest.firefox.json"
};

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function resetTargetDirectory(targetDirectory) {
  const resolvedTarget = path.resolve(targetDirectory);
  const resolvedDistRoot = path.resolve(distRoot);

  if (!resolvedTarget.startsWith(resolvedDistRoot + path.sep)) {
    throw new Error(`Refusing to reset path outside dist: ${resolvedTarget}`);
  }

  fs.rmSync(resolvedTarget, { recursive: true, force: true });
  fs.mkdirSync(resolvedTarget, { recursive: true });
}

function buildTarget(targetName) {
  const manifestFile = targets[targetName];
  if (!manifestFile) {
    throw new Error(`Unknown target: ${targetName}`);
  }

  const targetDirectory = path.join(distRoot, targetName);
  resetTargetDirectory(targetDirectory);

  copyFile(path.join(root, manifestFile), path.join(targetDirectory, "manifest.json"));
  copyFile(path.join(root, "README.md"), path.join(targetDirectory, "README.md"));
  fs.cpSync(path.join(root, "src"), path.join(targetDirectory, "src"), { recursive: true });
}

function main() {
  const requestedTarget = process.argv[2] || "all";
  const requestedTargets = requestedTarget === "all" ? Object.keys(targets) : [requestedTarget];

  for (const targetName of requestedTargets) {
    buildTarget(targetName);
  }
}

main();
