// imports
const fs = require("fs");
const objectHash = require("object-hash");
const zlib = require("node:zlib");

// commandline parser
let commands = {
  'init': initCaller,
  // 'add': addCaller,
  // 'commit': commitCaller,
  // 'log': logCaller,
  // 'branch': branchCaller,
  // 'checkout': checkoutCaller
}

commandlineParser();
function commandlineParser(){
  let args = process.argv.slice(2);
  if(!(args[0] in commands)) {
    console.log("invalid command, please try again");
    return;
  }
  if(args[0]!='init') setUpGlobals();
  commands[args[0]](...args.slice(1));
}

//globals
const globals = require("./globals");

// util functions
function debug(...inp) {
  console.log(...inp);
}

function logMessage(msg) {
  console.log(msg);
}

function setRootDir(path) {
  globals.rootDir = path;
}

function createEmptyFile(path) {
  try {
    fs.closeSync(fs.openSync(globals.rootDir + path, "w"));
  } catch (err) {
    console.log(err);
  }
}

function deleteFile(path) {
  fs.rmSync(globals.rootDir + path, {
    force: true,
  });
}

function deleteDir(path) {
  fs.rmSync(globals.rootDir + path, {
    force: true,
    recursive: true,
  });
}

function createDir(path) {
  fs.mkdirSync(globals.rootDir + path, {
    recursive: true,
  });
}

function listPathsInDir(path) {
  return fs
    .readdirSync(globals.rootDir + path, { recursive: true })
    .map((file) => file.replace(/\\/g, "/"))
    .filter((e) => e);
}

function writeToFile(path, data, encoding = "utf-8") {
  fs.writeFileSync(globals.rootDir + path, data, {
    encoding: encoding,
  });
}

function readFile(path, encoding = "utf-8") {
  return fs.readFileSync(globals.rootDir + path, {
    encoding: encoding,
  });
}

function pathExists(path) {
  return fs.existsSync(globals.rootDir + path);
}

function isFile(path) {
  return fs.statSync(globals.rootDir + path).isFile();
}

function isDir(path) {
  try {
    return fs.statSync(globals.rootDir + path).isDirectory();
  } catch (err) {
    return false;
  }
}

function hash(data, algorithm = "sha1") {
  return objectHash(data, {
    algorithm: algorithm,
  });
}

function compress(data) {
  return zlib.deflateSync(data);
}

function decompress(data) {
  let ret = zlib.inflateSync(data).toString();
  return ret;
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

function getLastCommit() {
  let head = readFile(".legit/HEAD");
  let branch = "";
  if (head.split(" ")[0] != "ref:") return head;
  branch = head.split(" ")[1];
  branch = ".legit/" + branch;
  if (!(pathExists(branch) && isFile(branch))) return false;
  let commit = readFile(branch).split("\n")[0];
  if (commit.length == 0) return false;
  return commit;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);

  const options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
    timeZoneOffset: "numeric",
  };
  const formattedDate = date.toLocaleString("en-US", options);
  return formattedDate;
}

function logCommit(file, commitHash) {
  let author = file[1].split(" ")[1];
  let timestamp = file[1].split(" ")[3];
  let commitMsg = file[4];
  if (file[1].split(" ")[0] != "author") {
    //if parent exists
    author = file[2].split(" ")[1];
    timestamp = file[2].split(" ")[3];
    commitMsg = file[5];
  }
  console.log(
    `${globals.yellowColor}commit ${commitHash}${globals.resetColor}`
  );
  console.log("Author:", author);
  console.log("Date:", formatTimestamp(parseInt(timestamp)));
  console.log(`\n${commitMsg}\n`);
}

function getObjectFromHash(objectHash) {
  let filePath = `${globals.objectDir}${objectHash.slice(0,2)}/${objectHash.slice(2)}`;
  return decompress(readFile(filePath,null));
}

function populateChildrenFromTree(treeHash){
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
      writeToFile(
        getPath(newblob.name),
        getObjectFromHash(newblob.hash)
      );
    } else if (
      oldblobs.filter((obj) => {
        return obj.name == newblob.name && obj.hash !== newblob.hash;
      }).length > 0
    ) {
      writeToFile(
        getPath(newblob.name),
        getObjectFromHash(newblob.hash)
      );
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

const init = () => {
  for (let dir of globals.baseDirs) {
    createDir(dir);
  }
  for (let file of globals.baseFiles) {
    createEmptyFile(file);
  }
  writeToFile(".legit/HEAD", globals.baseRef);
};

const isInit = () => {
  for (let dir of globals.baseDirs) {
    if (!pathExists(dir)) {
      logMessage(dir + " is missing");
      return false;
    }
  }

  for (let file of globals.baseFiles) {
    if (!pathExists(file)) {
      logMessage(file + " is missing");
      return false;
    }
  }
  return true;
};

function createObjectFromFileContent(fileContent) {
  let fileHash = hash(fileContent);
  createDir(globals.objectDir + fileHash.slice(0, 2));
  let filePath = `${globals.objectDir}${fileHash.slice(0, 2)}/${fileHash.slice(2)}`;
  createEmptyFile(filePath);
  let compressedFile = compress(fileContent);
  writeToFile(filePath, compressedFile);
}

const add = (files) => {
  if (!isInit()) {
    logMessage(".legit files missing");
    return;
  }

  let indexContent = "";

  for (let file of files) {
    let fileContent = readFile(file);
    let fileHash = hash(fileContent);

    indexContent += `${fileHash} ${file}\n`;

    createObjectFromFileContent(fileContent);
  }

  writeToFile(globals.indexDir, indexContent);
};

const addAll = () => {
  if (!isInit()) {
    logMessage(".legit files missing");
    return;
  }

  let files = listPathsInDir("").filter((file) => {
    return isFile(file) && !isIgnoredFromAdd(file);
  });

  add(files);
};

function isIgnoredFromAdd(file) {
  return file.slice(0, 7) == ".legit/";
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

function createCommitStr(treeHash){
  let commitStr = "";
  let time = new Date();
  time = time.getTime();
  commitStr += `tree ${treeHash}\n`;
  let parentCommit = getLastCommit();
  if (parentCommit) commitStr += `parent ${parentCommit}\n`;
  commitStr += `author ${globals.username} <${globals.email}> ${time}\n`;
  commitStr += `committer ${globals.username} <${globals.email}> ${time}\n`;
  commitStr += `\n`;
  commitStr += `${globals.commitMessage}\n`;
  return commitStr;
}

function updateRefsWithCommit(commitStr){
  let head = readFile(".legit/HEAD");
  let branch = "";
  if (head.split(" ")[0] != "ref:") throw "can't commit in detached state";
  branch = head.split(" ")[1];
  branch = ".legit/" + branch;
  if (!(pathExists(branch) && isFile(branch))) createEmptyFile(branch);
  writeToFile(branch, hash(commitStr));
}

const commit = () => {
  let root = createTree();
  let commitStr = createCommitStr(root.hash);
  
  createObjectFromFileContent(commitStr);
  updateRefsWithCommit(commitStr);
};

const log = () => {
  let lastCommit = getLastCommit();
  if (!lastCommit) {
    console.log("You haven't committed anything");
    return;
  }
  let file = getObjectFromHash(lastCommit).split('\n');
  let parent = file[1].split(" ")[0];

  while (parent === "parent") {
    logCommit(file, lastCommit);
    lastCommit = file[1].split(" ")[1];
    file = getObjectFromHash(lastCommit).split('\n');
    parent = file[1].split(" ")[0];
  }
  logCommit(file, lastCommit);
};

const checkoutCommit = (nextCommit) => {
  let currCommit = getLastCommit();
  writeToFile(".legit/HEAD", nextCommit);
  
  let currTreeHash = getObjectFromHash(currCommit).split('\n')[0].split(" ")[1];
  let nextTreeHash = getObjectFromHash(nextCommit).split('\n')[0].split(" ")[1];
  updateFilesFromTrees(currTreeHash, nextTreeHash);
};

const createBranch = (branchName) => {
  // create new dir/file in refs/heads/branchname
  let dirs = branchName.split("/").slice(0, -1).join("/");
  let branch = branchName.split("/").slice(-1)[0];
  createDir(globals.headsDir+dirs);
  createEmptyFile(globals.headsDir+branchName);
 // copy the contents if the current branch, pointed to by HEAD into the new file
  let lastCommit = getLastCommit();
  writeToFile(globals.headsDir+branchName,lastCommit);
}

function getCurrentBranch(){
  let head = readFile('.legit/HEAD').split("\n")[0].split(" ");
  if(head.length == 1) return false;
  let ref = head.slice(-1)[0];
  return ref.split("/").slice(2).join("/");
}

const listBranches = () => {

  let allPaths = listPathsInDir(globals.headsDir).filter(path=>{
    return isFile(globals.headsDir+path);
  }); 

  let currentBranch = getCurrentBranch();
  if(!currentBranch) {
    console.log(`  ${globals.greenColor}(HEAD in detached state) at ${getLastCommit()}${globals.resetColor}`);
  }
  
  for(path of allPaths){
    if(currentBranch==path){
      console.log(`* ${globals.greenColor}${path}${globals.resetColor}`)
    }
    else{
      console.log(`  ${path}`);
    }
  }
}

function isValidBranch(branchName){
  let branchFile = globals.headsDir+branchName;
  if(!pathExists(branchFile)) return false;
  let commitHash = readFile(branchFile).split("\n").filter(e=>e)[0];
  let filePath = `${globals.objectDir}${commitHash.slice(0,2)}/${commitHash.slice(2)}`;
  if(pathExists(filePath) && isFile(filePath)) return true;
  return false;
}

function getCommitFromBranch(branchName){
  let branchFile = globals.headsDir+branchName;
  let commitHash = readFile(branchFile).split("\n").filter(e=>e)[0];
  return commitHash;
} 

const checkoutBranch = (branchName) => {
  let currCommit = getLastCommit();

  if(!isValidBranch(branchName)) {
    console.log("invalid branch name");
    return;
  }
  let nextCommit = getCommitFromBranch(branchName);

  writeToFile('.legit/HEAD', `ref: refs/heads/${branchName}`);

  let currTreeHash = getObjectFromHash(currCommit).split('\n')[0].split(" ")[1];
  let nextTreeHash = getObjectFromHash(nextCommit).split('\n')[0].split(" ")[1];
  updateFilesFromTrees(currTreeHash, nextTreeHash);
}

function setUpGlobals(){
  // let rootDir = "./";
  // while(pathExists(rootDir+'.legit') && isDir(rootDir+'.legit')){
  //   rootDir += "../";
  // }
  // globals.rootDir = rootDir;
  console.log("helo");
}

function initCaller(...args){
  // legit init
  // setUpGlobals()
  console.log(args);
}

module.exports = {
  // utils
  debug,
  logMessage,
  setRootDir,
  createEmptyFile,
  deleteFile,
  deleteDir,
  createDir,
  writeToFile,
  listPathsInDir,
  readFile,
  pathExists,
  isFile,
  isDir,
  hash,
  compress,
  decompress,
  // core exports
  indexToTree,
  addTreeToObjects,
  getLastCommit,
  formatTimestamp,
  logCommit,
  getObjectFromHash,
  createObjectFromFileContent,
  updateFilesFromTrees,
  // core
  init,
  isInit,
  add,
  addAll,
  commit,
  log,
  checkoutCommit,
  createBranch,
  listBranches,
  getCurrentBranch,
  checkoutBranch,
  getCommitFromBranch,
  //globals
  globals,
};
