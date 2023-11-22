const globals = require("./../globals");
const {
  createEmptyFile,
  deleteFile,
  deleteDir,
  createDir,
  listPathsInDir,
  writeToFile,
  readFile,
  pathExists,
  isFile,
  isDir
} = require('../util/fs_util');
const {
  isInit,
  createObjectFromFileContent,
  debug,
  logMessage,
  setRootDir,
  hash,
  compress,
  decompress,
  getObjectFromHash,
  getLastCommit,
  createCommitStr,
  updateRefsWithCommit,
  getBranches,
  getCurrentBranch
} = require('../util/util.js');

function branchCaller(...args) {
    if (args.length === 0) {
      listBranches();
    } else {
      createBranch(args[0]);
    }
  }

function createBranch(branchName) {
  // create new dir/file in refs/heads/branchname
  let dirs = branchName.split("/").slice(0, -1).join("/");
  let branch = branchName.split("/").slice(-1)[0];
  createDir(globals.headsDir + dirs);
  createEmptyFile(globals.headsDir + branchName);
  // copy the contents if the current branch, pointed to by HEAD into the new file
  let lastCommit = getLastCommit();
  writeToFile(globals.headsDir + branchName, lastCommit);
}

function listBranches() {
  // TODO fix the list in dir function when ti ends with a /
  let allPaths = getBranches();

  let currentBranch = getCurrentBranch();
  if (!currentBranch) {
    console.log(
      `  ${globals.greenColor}(HEAD in detached state) at ${getLastCommit()}${globals.resetColor}`
    );
  }

  for (let path of allPaths) {
    if (currentBranch == path) {
      console.log(`* ${globals.greenColor}${path}${globals.resetColor}`);
    } else {
      console.log(`  ${path}`);
    }
  }
}

module.exports = {
  branchCaller,  
  createBranch,
  listBranches,
};