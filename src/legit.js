// imports
const fs = require("fs");
const objectHash = require("object-hash");
const zlib = require("node:zlib");

//globals
const globals = require("./globals");

// commandline parser
let commands = {
  'init': initCaller,
  'add': addCaller,
  'ls': lsCaller,
  'commit': commitCaller,
  'log': logCaller,
  'branch': branchCaller,
  'checkout': checkoutCaller,
  'reset': resetCaller,
  // 'cat-file' : catFileCaller
}

commandlineParser();
function commandlineParser(){
  let args = process.argv.slice(2);
  if(args.length==0) {
    // tests in progress
    return;
  }
  if(!(args[0] in commands)) {
    console.log("invalid command, please try again");
    return;
  }
  if(args[0]!='init') setUpGlobals();
  commands[args[0]](...args.slice(1));
}

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

function listPathsInRoot(path,currDir = ""){
  let childPaths = fs
    .readdirSync(globals.rootDir + path)
    .map((file) => {
      if(currDir)
        return currDir+"/"+file.replace(/\\/g, "/")
      return file.replace(/\\/g, "/");
    })
    .filter((e) => e);
  let newfiles = [];
  for(let childPath of childPaths){
    if(isDir(childPath)){
      newfiles = [...newfiles,...listPathsInRoot(childPath,childPath)]
    }
  }
  return [...childPaths,...newfiles];
}

// ! this is convoluted and ugly like this because of lacking implementation of list paths in Dir
function listPathsInDir(path) {
  if(path=="" || path=="./") return listPathsInRoot("");
  return listPathsInRoot("").filter(line=>{
    return line && line.slice(0,path.length) == path;
  }).map(line=>{
    return line.slice(path.length+1);
  }).filter(e=>e)
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
  return fs.statSync(globals.rootDir + path).isDirectory();
}

function hash(data, algorithm = "sha1") {
  return objectHash(data, {
    algorithm: algorithm,
  });
}

function compress(data) {
  return data;
  // return zlib.deflateSync(data);
}

function decompress(data) {
  return data.toString();
  // let ret = zlib.inflateSync(data).toString();
  // return ret;
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

function init(){
  for (let dir of globals.baseDirs) {
    createDir(dir);
  }
  for (let file of globals.baseFiles) {
    createEmptyFile(file);
  }
  writeToFile(".legit/HEAD", globals.baseRef);
  writeToFile(".legit/config",`name lemon\nemail lemon@hoggymail.com`);
};

function isInit(){
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
  writeToFile(filePath, compressedFile,'utf-8');
}

function add(files){
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

function addAll(){
  if (!isInit()) {
    logMessage(".legit files missing");
    return;
  }

  // console.log(listPathsInDir(""),globals.rootDir);
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

function commit(){
  let root = createTree();
  let commitStr = createCommitStr(root.hash);
  
  createObjectFromFileContent(commitStr);
  updateRefsWithCommit(commitStr);
};

function log(){
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

function checkoutCommit(nextCommit){
  let currCommit = getLastCommit();
  writeToFile(".legit/HEAD", nextCommit);
  
  let currTreeHash = getObjectFromHash(currCommit).split('\n')[0].split(" ")[1];
  let nextTreeHash = getObjectFromHash(nextCommit).split('\n')[0].split(" ")[1];
  updateFilesFromTrees(currTreeHash, nextTreeHash);
};

function createBranch(branchName){
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

function listBranches(){
  // TODO fix the list in dir function when ti ends with a /
  let allPaths = listPathsInDir(globals.headsDir.slice(0,-1)).filter(path=>{
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

function getBranches(){
  return allPaths = listPathsInDir(globals.headsDir.slice(0,-1)).filter(path=>{
    return isFile(globals.headsDir+path);
  }); 
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

function checkoutBranch(branchName){
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

function reset(mode, commit){
  if(!fullCommitHash(commit)) {
    console.log("invalid Commit");
    return;
  }
  let currCommit = getLastCommit();
  let currBranch = getCurrentBranch();
  writeToFile(globals.headsDir+currBranch, fullCommitHash(commit));
  
  if(mode == "--mixed"){
    writeToFile(globals.indexDir, "");
  }

  else if(mode == "--hard"){
    writeToFile(globals.indexDir, "");
    let currTreeHash = getObjectFromHash(currCommit).split('\n')[0].split(" ")[1];
    let nextTreeHash = getObjectFromHash(fullCommitHash(commit)).split('\n')[0].split(" ")[1];
    updateFilesFromTrees(currTreeHash, nextTreeHash);
  }
}

function merge(){

}

function setUpGlobals(){
  let currDir = process.cwd().replace(/\\/g,'/').split("/");
  let rootDir = "./";
  let fromLast = 0;
  while(!(pathExists(rootDir+'.legit') && isDir(rootDir+'.legit'))){
    rootDir += "../";
    fromLast++;
  }
  globals.rootDir = rootDir;
  if(fromLast!=0)
    globals.rootToWorkingPath = currDir.slice(-fromLast).join("/")+"/";
}

function fullCommitHash(partialHash){
  // limit of characters needed: 3
  let hashDir = globals.objectDir+partialHash.slice(0,2);
  let restOfHash = partialHash.slice(2);
  if(pathExists(hashDir)){
    let objects = listPathsInDir(hashDir);
    let matches = objects.filter(obj=>{
      return obj.slice(0,restOfHash.length) == restOfHash;
    })
    if(matches.length == 0){
      return "";
    }
    else if(matches.length>1){
      console.log('ambiguous commit hash, provide longer hash');
      return "";
    }
    else{
      return partialHash.slice(0,2) + matches[0];
    }
  }
  else return "";
}

function initCaller(...args){
  globals.rootDir = process.cwd().replace(/\\/g,'/')+"/";
  init();
}

function addCaller(...args){
  if(['-A','--all'].includes(args[0])){
    addAll();
    return;
  }

  // if(['.','./'].includes(args[0])){
  //   let files = listPathsInDir(globals.rootToWorkingPath).filter((file) => {
  //     return isFile(globals.rootToWorkingPath+file) && !isIgnoredFromAdd(globals.rootToWorkingPath+file);
  //   }).map(file=> {
  //     return globals.rootToWorkingPath+file;
  //   });
  //   console.log(files);
  //   add(files);
  //   return;
  // }

  // TODO need to add ../ resolution support
  let files = args.map(file=> {return globals.rootToWorkingPath+file} )
  for(let file of files){
    if(!(pathExists(file) && isFile(file))){
      console.log(`fatal: pathspec '${file}' did not match any files`)
      return; 
    } 
  }
  add(files);
}

function lsCaller(...args){
  if(args.length==0) args = [''];
  console.log(listPathsInDir(globals.rootToWorkingPath+args[0]));
}

function commitCaller(...args){
  // need to support -m option and also using code to edit message option
  // get message from user, and username from config file.
  // need to create a new config file in .legit which stores username and email
  // for now can store it in any format ex: JSON
  if(args[0]!='-m') {
    console.log('invalid args');
    return;
  }
  globals.commitMessage = args.slice(1).join(" ");
  let configLines = readFile(".legit/config").split("\n");
  configLines.forEach((line) => {
    if(line.split(" ")[0] == "name"){
      globals.username = line.split(" ")[1];
    }
    if(line.split(" ")[0] == "email"){
      globals.email = line.split(" ")[1];
    }
  })
  console.log(globals.commitMessage,globals.username, globals.email)
  if(globals.commitMessage && globals.username && globals.email) commit();
  else console.log("invalid message or config info");
}

function logCaller(...args){
  log();
}

function branchCaller(...args){
  if(args.length === 0){
    listBranches();
  }
  else{
    createBranch(args[0]);
  }
}

function checkoutCaller(...args){
  let branches = getBranches();
  if(args[0] == '-b'){
    if(branches.includes(args[1])){
      console.log("error: branch already exists");
      return;
    }
    else{
      createBranch(args[1]);
      writeToFile('.legit/HEAD',`ref: refs/heads/${args[1]}`);
    }
  }
  else if(branches.includes(args[0])){
    checkoutBranch(args[0]);
  }
  else if(fullCommitHash(args[0])){
    checkoutCommit(fullCommitHash(args[0]));
  }
  else{
    console.log("error: invalid arguments");
  }
}

function resetCaller(...args){
  if(!['--soft','--mixed','--hard'].includes(args[0])) {
    reset('--mixed',args[0]);
  }
  else 
    reset(args[0],args[1]);
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
