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
  fullCommitHash,
  getBranches
} = require('../util/util.js');

const {
  createBranch
} = require('./branch.js');

function checkoutCaller(...args) {
  let branches = getBranches();
  if(!pathExists('.legit/refs')) throw "breaks byond this point";
  if (args[0] == "-b") {
    if (branches.includes(args[1])) {
      console.log("error: branch already exists");
      return;
    } else {
      createBranch(args[1]);
      writeToFile(".legit/HEAD", `ref: refs/heads/${args[1]}`);
    }
  } else if (branches.includes(args[0])) {
    console.log("branch only")
    checkoutBranch(args[0]);
  } else if (fullCommitHash(args[0])) {
    console.log("it wne tot commuit");
    checkoutCommit(fullCommitHash(args[0]));
  } else {
    console.log("error: invalid arguments");
  }
}

function isValidBranch(branchName) {
  let branchFile = globals.headsDir + branchName;
  if (!pathExists(branchFile)) return false;
  let commitHash = readFile(branchFile)
    .split("\n")
    .filter((e) => e)[0];
  let filePath = `${globals.objectDir}${commitHash.slice(
    0,
    2
  )}/${commitHash.slice(2)}`;
  if (pathExists(filePath) && isFile(filePath)) return true;
  return false;
}

function checkoutCommit(nextCommit) {
  let currCommit = getLastCommit();
  writeToFile(".legit/HEAD", nextCommit);

  let currTreeHash = getObjectFromHash(currCommit).split("\n")[0].split(" ")[1];
  let nextTreeHash = getObjectFromHash(nextCommit).split("\n")[0].split(" ")[1];
  updateFilesFromTrees(currTreeHash, nextTreeHash);
}

function checkoutBranch(branchName) {
  if(!pathExists('.legit/refs')) throw "breaks byond this point";
  let currCommit = getLastCommit();

  if (!isValidBranch(branchName)) {
    console.log("invalid branch name");
    return;
  }
  let nextCommit = getCommitFromBranch(branchName);

  writeToFile(".legit/HEAD", `ref: refs/heads/${branchName}`);
  if(!pathExists('.legit/refs')) throw "breaks byond this point";

  let currTreeHash = getObjectFromHash(currCommit).split("\n")[0].split(" ")[1];
  let nextTreeHash = getObjectFromHash(nextCommit).split("\n")[0].split(" ")[1];
  updateFilesFromTrees(currTreeHash, nextTreeHash);
  if(!pathExists('.legit/refs')) throw "breaks byond this point";
}

function getCommitFromBranch(branchName) {
  let branchFile = globals.headsDir + branchName;
  let commitHash = readFile(branchFile)
    .split("\n")
    .filter((e) => e)[0];
  return commitHash;
}

function updateFilesFromTrees(currTreeHash, nextTreeHash, currDir = "") {
  let currTree = [];
  let nextTree = [];

  if (currTreeHash != "") currTree = populateChildrenFromTree(currTreeHash);
  nextTree = populateChildrenFromTree(nextTreeHash);

  let getPath = (nodeName) => {
    let str = currDir + "/" + nodeName;
    return str.slice(1);
  };

  // if blob
  // if name in new and name not in old -> create file and fill file with contents(via hash)
  // if name in old and not in new -> delete file
  // if name in both && hash is not same -> update contents with hash found in new
  let oldblobs = currTree.filter((node) => node.type == "blob");
  let newblobs = nextTree.filter((node) => node.type == "blob");
  for (let newblob of newblobs) {
    if (
      oldblobs.filter((obj) => {
        return obj.name == newblob.name;
      }).length === 0
    ) {
      createEmptyFile(getPath(newblob.name));
      writeToFile(getPath(newblob.name), getObjectFromHash(newblob.hash));
    } else if (
      oldblobs.filter((obj) => {
        return obj.name == newblob.name && obj.hash !== newblob.hash;
      }).length > 0
    ) {
      writeToFile(getPath(newblob.name), getObjectFromHash(newblob.hash));
    }
  }

  for (let oldblob of oldblobs) {
    if (
      newblobs.filter((obj) => {
        return obj.name == oldblob.name;
      }).length === 0
    ) {
      deleteFile(getPath(oldblob.name));
    }
  }

  // if tree
  // if name in new and name not in old -> create dir and call the updateTree recursively , currDir = currDir+name
  // if name in old and not in new -> delete dir
  // if name in both && hash is not same -> call the updateTree recursively , currDir = currDir+name
  let oldtrees = currTree.filter((node) => node.type == "tree");
  let newtrees = nextTree.filter((node) => node.type == "tree");
  for (let newtree of newtrees) {
    if (
      oldtrees.filter((obj) => {
        return obj.name == newtree.name;
      }).length === 0
    ) {
      createDir(getPath(newtree.name));
      // recursively create contents of dir newtree.name
      updateFilesFromTrees("", newtree.hash, currDir + "/" + newtree.name);
    } else if (
      oldtrees.filter((obj) => {
        return obj.name == newtree.name && obj.hash !== newtree.hash;
      }).length > 0
    ) {
      let nextArg = oldtrees.filter((obj) => {
        return obj.name == newtree.name && obj.hash !== newtree.hash;
      })[0].hash;
      console.log(nextArg);
      updateFilesFromTrees(nextArg, newtree.hash, currDir + "/" + newtree.name);
    }
  }

  for (let oldtree of oldtrees) {
    if (
      newtrees.filter((obj) => {
        return obj.name == oldtree.name;
      }).length === 0
    ) {
      deleteDir(getPath(oldtree.name));
    }
  }
}

function populateChildrenFromTree(treeHash) {
  let children = [];
  getObjectFromHash(treeHash)
    .split("\n")
    .filter((e) => e)
    .forEach((line) => {
      let [type, hash, name] = line.split(" ");
      children.push({
        type,
        name,
        hash,
      });
    });
  return children;
}

module.exports = {
  checkoutCaller,
  checkoutCommit,
  checkoutBranch,
  getCommitFromBranch,
  updateFilesFromTrees
}