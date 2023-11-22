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
  getBranches,
  getCurrentBranch,
  parseCommit
} = require('../util/util.js');
const {
  updateFilesFromTrees
} = require('./checkout.js');

function mergeCaller(...args) {
  // branch name is args[0]
  merge(args[0]);
}

function merge(branchName) {
  let currCommit = getLastCommit();
  let incomingCommit = readFile(globals.headsDir + branchName);
  let mergeBase = getCommonAncestor(currCommit, incomingCommit);
  if (mergeBase == currCommit) {
    // ! fast forword merge
    // A -- B -- C - main (.legit/HEAD)
    //            \
    //             D -- E - feature (passed as arg)
    // A -- B -- C -- D -- E - feature,Main
    //
    console.log("Fast Farwording Merge");
    let currBranch = getCurrentBranch();
    writeToFile(globals.headsDir + currBranch, incomingCommit);
  } else {
    // ! true merge 
    // A -- B -- C -- F
    //            \
    //             D -- E -feature
    // A -- B -- C -- F -- E' (Tree of E,F) - Main (running merge from main)
    //            \      /
    //             D -- E -feature
    //
    // ! steps for when no merge conflict 
    // ! conflict only occurs when the same file is modified
    // find merge base 
    // get trees from merge base, current commit, and incoming commit
    let baseTree = getTreeFromHash(parseCommit(mergeBase).tree, "root");
    let currTree = getTreeFromHash(parseCommit(currCommit).tree, "root");
    let incomingTree = getTreeFromHash(parseCommit(incomingCommit).tree, "root");

    // calculate hashes for new tree
    let mergedTree = getMergedTree(baseTree,currTree,incomingTree);
    
    // create a new commit while asking for commit message,
    writeToFile(".legit/COMMIT_EDITMSG", "merge commit");
    execSync(globals.commitFileCommand);
    globals.commitMessage = readFile(".legit/COMMIT_EDITMSG")
      .split("\n")
      .filter((line) => {
        return line.trim()[0] != "#";
      }).join("");
    
    // new commit
    let commitStr = createCommitStr(mergedTree.hash,{currCommit,incomingCommit});
    console.log(commitStr);
    let commitHash = hash(commitStr);
    createObjectFromFileContent(commitStr);

    // update refs
    let currBranch = getCurrentBranch();
    writeToFile(globals.headsDir + currBranch, commitHash);

    // update working dir
    let currTreeHash = parseCommit(currCommit).tree;
    let nextTreeHash = mergedTree.hash;
    updateFilesFromTrees(currTreeHash, nextTreeHash);
  }
}

function getMergedTree(baseTree,currTree,incomingTree){
  //  ! !!!!!!! need to deal with case where there is an empty line in treeNode
  
  // with the copy of merge base tree, recursively,
  let mergeTree = {name: baseTree.name, type:'tree'};

  // if blob
    // * existing files
      // ? different hashes in base, incoming and curr for same file - (both curr/incoming modified same file) -  
        // conflict
      // ? existing file has same hash in one of incoming/curr, and a new hash in the other - (one of curr/incoming modified) - 
        // take the modified hash
      // ? file has same hash in incoming and curr
        // take the hash
    // * creation
      // ? different hashes in incoming and curr for same file - (both curr/incoming created same file with diff content -  
        // conflict
      // ? same hash for file in incoming and curr - (both curr/incoming, created same exact file)
        // take the hash and add file
      // ? if a filename only is in curr xor incoming - 
        // take the hash and add the file to tree
    // * deletion
      // ? if file name is present in base and one of curr or incoming with a different hash - (deleted by one and modified but other)
        // conflict
      // ? if a filename from base is present in curr or incoming with same hash - (has been deleted by one or both of incoming or curr)
        // do not add file
        
  let mergeBlobs = [];
  let baseBlobs = {}; 
  baseTree && baseTree.children.filter(child=>{
    return child.type=='blob';
  }).forEach(blobObj=>{
    baseBlobs[blobObj.name] = blobObj.hash;
  })
  let currBlobs = {};
  currTree && currTree.children.filter(child=>{
    return child.type=='blob';
  }).forEach(blobObj=>{
    currBlobs[blobObj.name] = blobObj.hash;
  })
  let incomingBlobs = {};
  incomingTree && incomingTree.children.filter(child=>{
    return child.type=='blob';
  }).forEach(blobObj=>{
    incomingBlobs[blobObj.name] = blobObj.hash;
  })
  
  for(let file in baseBlobs){
    if((file in currBlobs) && (file in incomingBlobs)){
      // ! files are modified
      if(currBlobs[file] == incomingBlobs[file]){
        mergeBlobs.push({'type': 'blob', 'hash': currBlobs[file], 'name': file});
      }
      else if((currBlobs[file] != baseBlobs[file]) && (incomingBlobs[file] == baseBlobs[file])){
        mergeBlobs.push({'type': 'blob', 'hash': currBlobs[file], 'name': file});
      }
      else if((currBlobs[file] == baseBlobs[file]) && (incomingBlobs[file] != baseBlobs[file])){
        mergeBlobs.push({'type': 'blob', 'hash': incomingBlobs[file], 'name': file});
      }
      else{
        console.log(`Conflict in file ${file}`);
      }
    }
    // ! when files are deleted
    else if(!(file in currBlobs) && (file in incomingBlobs)){
      if(incomingBlobs[file]==baseBlobs[file]){
        continue;
      }
      else{
        console.log(`Conflict in file ${file}`);
      }
    }
    else if((file in currBlobs) && !(file in incomingBlobs)){
      if(currBlobs[file]==baseBlobs[file]){
        continue;
      }
      else{
        console.log(`Conflict in file ${file}`);
      }
    }
    else {
      continue;
    }
  }

  // ! when files are created
  for(let file in currBlobs){
    if(!(file in baseBlobs) && !(file in incomingBlobs)){
      mergeBlobs.push({'type': 'blob', 'hash': currBlobs[file], 'name': file});
    }
    else if(!(file in baseBlobs) && (file in incomingBlobs)){
      if(incomingBlobs[file] != currBlobs[file]) {
        console.log(`Conflict in file ${file}`);
      }
      else {
        mergeBlobs.push({'type': 'blob', 'hash': currBlobs[file], 'name': file});
      }
    }
  }

  for(let file in incomingBlobs){
    if(!(file in baseBlobs) && !(file in currBlobs)){
      mergeBlobs.push({'type': 'blob', 'hash': incomingBlobs[file], 'name': file});
    }
    // other conditions taken care in previous loop
  }
  
  let mergeTrees = [];   
  let baseTrees = {}; 
  baseTree && baseTree.children.filter(child=>{
    return child.type=='tree';
  }).forEach(treeObj=>{
    baseTrees[treeObj.name] = treeObj;
  })
  let currTrees = {};
  currTree && currTree.children.filter(child=>{
    return child.type=='tree';
  }).forEach(treeObj=>{
    currTrees[treeObj.name] = treeObj;
  })
  let incomingTrees = {};
  incomingTree && incomingTree.children.filter(child=>{
    return child.type=='tree';
  }).forEach(treeObj=>{
    incomingTrees[treeObj.name] = treeObj;
  })
  
  for(let dir in baseTrees){
    if((dir in currTrees) && (dir in incomingTrees)){
      // ! dir are modified
      if(currTrees[dir].hash == incomingTrees[dir].hash){
        mergeTrees.push(currTrees[dir]);
      }
      else if((currTrees[dir].hash != baseTrees[dir].hash) && (incomingTrees[dir].hash == baseTrees[dir].hash)){
        mergeTrees.push(currTrees[dir]);
      }
      else if((currTrees[dir].hash == baseTrees[dir].hash) && (incomingTrees[dir].hash != baseTrees[dir].hash)){
        mergeTrees.push(incomingTrees[dir]);
      }
      else{
        mergeTrees.push(getMergedTree(baseTrees[dir], currTrees[dir], incomingTrees[dir]));
      }
    }
    // ! when dirs are deleted
    else if(!(dir in currTrees) && (dir in incomingTrees)){
      if(incomingTrees[dir].hash == baseTrees[dir].hash){
        continue;
      }
      else{
        mergeTrees.push(getMergedTree(baseTrees[dir],null,incomingTrees[dir]));
      }
    }
    else if((dir in currTrees) && !(dir in incomingTrees)){
      if(currTrees[dir].hash == baseTrees[dir].hash){
        continue;
      }
      else{
        mergeTrees.push(getMergedTree(baseTrees[dir],currTrees[dir],null));
      }
    }
    else {
      continue;
    }
  }

  // ! when dirs are created
  for(let dir in currTrees){
    if(!(dir in baseTrees) && !(dir in incomingTrees)){
      mergeTrees.push(currTrees[dir]);
    }
    else if(!(dir in baseTrees) && (dir in incomingTrees)){
      if(incomingTrees[dir] != currTrees[dir]) {
        mergeTrees.push(getMergedTree(null,currTrees[dir],incomingTrees[dir]));
      }
      else {
        mergeTrees.push(currTrees[dir]);
      }
    }
  }

  for(let dir in incomingTrees){
    if(!(dir in baseTrees) && !(dir in currTrees)){
      mergeTrees.push(incomingTrees[dir]);
    }
    // other conditions taken care in previous loop
  }
  
  // if tree
    // * existing trees
      // different hashes in base, incoming and curr for same tree - (both curr/incoming modified same file) -  
        // call recursively with  node of same file name
      // existing tree has same hash in one of incoming/curr, and a new hash in the other - (one of curr/incoming modified) - 
        // call recursively with node of same file name
      // existing file has same hash in all three, 
        // take existing hash
    // * creation
      // different hashes in incoming and curr for same tree - (both curr/incoming created same file with diff content -  
        // call recursively
      // same hash for tree in incoming and curr - (both curr/incoming, created same exact file)
        // take the hash
      // if a filename only is in curr xor incoming - 
        // take the hash
    // * deletion
      // if file name is present in base and one of curr or incoming with a different hash - (deleted by one and modified but other)
        // conflict
      // if a filename from base is present in curr or incoming with same hash - (has been deleted by one or both of incoming or curr)
        // dont take hash
  mergeTree.children = [...mergeBlobs,...mergeTrees];
  let treeStr = [];
  for(let child of mergeTree.children){
    treeStr.push(`${child.type} ${child.hash} ${child.name}`);
  }
  treeStr = treeStr.join("\n");
  createObjectFromFileContent(treeStr);
  mergeTree.hash = hash(treeStr);
  return mergeTree;
}

function getTreeFromHash(treeHash, nodeName){
  // make empty object to return, with name as nodeName and type: tree, hash: treehash
  // read the contents of hash,
  // make a temp list to accumulate children
  // for each child
    // if its a blob, add to list
      // {name:childname, hash:childhash, type:blob}
    // if its a tree add to list 
      // getTreeFromHash(childHash,childname)
  // add list to empty object in children property
  // return obj

  let treeObject = {name: nodeName, hash: treeHash, type:"tree"};
  let objs = getObjectFromHash(treeHash).split("\n").filter(e=>e).map((line) => {
    let [type, hash, name] = line.split(" ");
    return {
      type, hash, name
    }
  });
  let children = [];
  for(let obj of objs){
    if(obj.type == 'blob'){
      children.push(obj);
    }
    else{
      children.push(getTreeFromHash(obj.hash, obj.name))
    }
  }
  treeObject.children = children;
  return treeObject;
}

function getCommonAncestor(commitA, commitB) {
  if(commitA==commitB) return commitA;
  let commits = new Set();
  commits.add(commitA);
  commits.add(commitB);
  while ("parent" in parseCommit(commitA) || "parent" in parseCommit(commitB)) {
    let parsedA = parseCommit(commitA);
    let parsedB = parseCommit(commitB);
    if("parent" in parsedA){
      if(commits.has(parsedA.parent)){
        return parsedA.parent;
      }
      else{
        commits.add(parsedA.parent);
        commitA = parsedA.parent;
      }
    }
    if("parent" in parsedB){
      if(commits.has(parsedB.parent)){
        return parsedB.parent;
      }
      else{
        commits.add(parsedB.parent);
        commitA = parsedB.parent;
      }
    }
  }
  return "";
}

module.exports = {
  merge,
  mergeCaller,
  getMergedTree,
  getTreeFromHash,
  getCommonAncestor
}