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
  formatTimestamp,
  getBranches,
  fullCommitHash,
  getCurrentBranch,
  parseCommit,
  isDetached,
  setUpGlobals,
} = require('../util/util.js');
const {
  isIgnoredFromAdd
} = require('./add');

function statusCaller(...args){
  status();
}

// TODO need to write test cases for this

function status(){
  let currBranch = getCurrentBranch();
  if(!currBranch){
      let commitHash = readFile(".legit/HEAD").slice(0, 7); 
      let message = parseCommit(fullCommitHash(commitHash)).message;
      console.log(`HEAD detached at ${commitHash} ${message}`);
  }
  else{
    console.log(`On branch ${currBranch}`);
  }

  let lastCommit = getLastCommit();
  //console.log("after get last commit");
  let workingDirFiles = hashWorkingDirFiles(); 
  let indexFiles = hashIndexFiles(); 
  let lastCommitFiles = getPathsFromTree(lastCommit); 
  //console.log("after fetching all maps");
  
  if(!(lastCommit)) console.log("No commits yet"); 
  
  if(Object.keys(workingDirFiles).length == 0 && !(lastCommit) && Object.keys(indexFiles).length == 0){
    console.log("nothing to commit (create/copy files and use 'legit add' to track)");
    return;
  }

  let X = compareFiles(indexFiles, workingDirFiles);
  let Y = compareFiles(lastCommitFiles, indexFiles);
  if(!(changes(X) || changes(Y))){
    console.log("nothing to commit, working tree clean");
    return;
  }
  
  if(changes(Y)){
    console.log("Changes to be commited:");
    console.log('  (use "legit restore --staged <file>..." to unstage)');
    for(let file of Y.deleted) console.log(`        ${globals.greenColor}deleted:    ${file}${globals.resetColor}`);
    for(let file of Y.modified) console.log(`        ${globals.greenColor}modified:   ${file}${globals.resetColor}`);
    for(let file of Y.newfiles) console.log(`        ${globals.greenColor}new file:   ${file}${globals.resetColor}`);
    console.log('');
  }

  if(X.deleted.length > 0 || X.modified.length > 0){
    console.log("Changes not staged for commit:");
    console.log('  (use "legit add <file>..." to update what will be committed)');
    console.log('  (use "legit restore <file>..." to discard changes in working directory)');
    for(let file of X.deleted) console.log(`        ${globals.redColor}deleted:    ${file}${globals.resetColor}`);
    for(let file of X.modified) console.log(`        ${globals.redColor}modified:   ${file}${globals.resetColor}`);
    console.log('');
  }  

  if(X.newfiles.length > 0){
    console.log("Untracked files:");
    console.log('  (use "legit add <file>..." to include in what will be committed)');
    for(let file of X.newfiles) console.log(`        ${globals.redColor}${file}${globals.resetColor}`);
    console.log('');
  }

  if(!(changes(Y)) && (X.deleted.length > 0 || X.modified.length > 0)) 
    console.log('no changes added to commit (use "legit add" and/or "legit commit -a")');
  else if(!(changes(Y)) && (X.newfiles.length > 0)) 
    console.log('nothing added to commit but untracked files present (use "legit add" to track)');
}

function getPathsFromTree(commitHash){
  if(!commitHash) return;
  let tree = parseCommit(commitHash).tree;
  let fileToHash = {};
  createFileToHashMapping(tree,fileToHash,[]);
  return fileToHash;
}

function createFileToHashMapping(tree,fileToHash,parentDirs){
  let treeContent = getObjectFromHash(tree).split('\n').filter(e=>e).map(line=>{
    let [type,hash,name] = line.split(" ");
    return {
      type,hash,name
    }
  });
  treeContent.filter(obj=>obj.type=="blob").forEach(obj=>{
    let fullPath = [...parentDirs,obj.name].join("/");
    fileToHash[fullPath] = obj.hash;
  })
  treeContent.filter(obj=>obj.type=="tree").forEach(obj=>{
    createFileToHashMapping(obj.hash,fileToHash,[...parentDirs,obj.name]);
  })
}

function compareFiles(obj1, obj2){
  let diff = {'newfiles':[], 'modified':[], 'deleted':[]};
  if(obj1) Object.keys(obj1).forEach(key => {
    if(!(obj2) || !(key in obj2)) diff.deleted.push(key);
    else if(key in obj2 && obj2[key]!=obj1[key]) diff.modified.push(key);
  })
  if(obj2) Object.keys(obj2).forEach(key => {
    if(!(obj1 )|| !(key in obj1)) diff.newfiles.push(key);
  })
  return diff;
}

function hashWorkingDirFiles(){
  let workingDirFiles = {};
  let files = listPathsInDir("").filter((file) => {
    return isFile(file) && !isIgnoredFromAdd(file);
  });
  for(let file of files){
    let h = hash(readFile(file));
    workingDirFiles[file] = h;
  }
  return workingDirFiles;
}

function hashIndexFiles(){
  let indexFiles = {};
  readFile(globals.indexDir).split("\n").filter((line) => line.length != 0).map((line) => {
    let [hash, path] = line.split(" ");
    indexFiles[path] = hash;
  }); 
  return indexFiles;
}

function changes(obj){
  if(obj.deleted.length == 0 && obj.modified.length == 0 && obj.newfiles.length == 0) return false;
  return true;
}

module.exports = {
  statusCaller,
  status,
  getPathsFromTree,
  createFileToHashMapping,
  compareFiles,
  hashWorkingDirFiles,
  hashIndexFiles,
  changes,
};

// TODO  FIX COMPARE FILES
// HEAD detached at/from ? put in red