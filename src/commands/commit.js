const { execSync } = require("child_process");
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
  isDetached
} = require('../util/util.js');

function commitCaller(...args) {
  if (args.length == 0) {
    execSync(`code -w ${globals.rootDir + ".legit/COMMIT_EDITMSG"}`);
    globals.commitMessage = readFile( ".legit/COMMIT_EDITMSG")
      .split("\n")
      .filter((line) => {
        return line.trim()[0] != "#";
      }).join("");
  } else if (args.length != 0 && args[0] != "-m") {
    console.log("invalid args");
    return;
  } else {
    globals.commitMessage = args.slice(1).join(" ");
  }
  let configLines = readFile(".legit/config").split("\n");
  configLines.forEach((line) => {
    if (line.split(" ")[0] == "name") {
      globals.username = line.split(" ")[1];
    }
    if (line.split(" ")[0] == "email") {
      globals.email = line.split(" ")[1];
    }
  });
  // console.log(globals.commitMessage,globals.username, globals.email)
  if (globals.commitMessage && globals.username && globals.email) commit();
  else console.log("invalid message or config info");
}

function indexToTree(paths, map, cur = "") {
  let splits = paths
    .map((path) => path.split("/"))
    .filter((path) => path.length != 0);
  let root = {};

  for (let [parent, ...rest] of splits) {
    if (!Object.keys(root).includes(parent)) root[parent] = [];
    if (rest.length != 0) root[parent].push(rest.join("/"));
  }

  for (let key in root) {
    if (isDir(cur + "/" + key)) {
      root[key] = {
        type: "tree",
        name: key,
        children: indexToTree(root[key], map, cur + "/" + key),
      };
    } else {
      root[key] = {
        hash: map[`${cur}/${key}`.slice(1)],
        name: key,
        type: "blob",
      };
    }
  }
  return root;
}  

function addTreeToObjects(tree) {
  let children = Object.keys(tree.children);
  let treeStr = "";

  for (let child of children) {
    let currNode = tree.children[child];

    // this generates the hash for the tree node to use next
    if (currNode.type !== "blob") addTreeToObjects(currNode);

    treeStr += `${currNode.type} ${currNode.hash} ${currNode.name}\n`;
  }

  createObjectFromFileContent(treeStr);

  tree.hash = hash(treeStr);
}

function createTree() {
  let fileToHash = {};
  let indexFiles = readFile(globals.indexDir)
    .split("\n")
    .filter((line) => line.length != 0)
    .map((line) => {
      let [hash, path] = line.split(" ");
      fileToHash[path] = hash;
      return path;
    })
    .sort();

  let tree = indexToTree(indexFiles, fileToHash);
  let root = {
    name: "root",
    type: "tree",
    children: tree,
  };

  addTreeToObjects(root);
  return root;
}

function noChangesToCommit(treeHash) {
  let lastCommit = getLastCommit();
  if (lastCommit) {
    let lastTree = getObjectFromHash(lastCommit);
    let lastTreeHash = lastTree.split("\n")[0].split(" ")[1];
    if (lastTreeHash == treeHash) {
      console.log("Working directory clean, no changes made since last commit");
      return true;
    }
  }
  return false;
}

function commit() {
  if(isDetached()) {
    console.log("currently in detached state, not allowed to commit");
    return;
  }
  let root = createTree();
  let commitStr = createCommitStr(root.hash);
  if (noChangesToCommit(root.hash)) return;
  createObjectFromFileContent(commitStr);
  updateRefsWithCommit(commitStr);
}

module.exports = {
  commitCaller,
  commit,
  indexToTree,
  addTreeToObjects,
  createTree,
  noChangesToCommit
}