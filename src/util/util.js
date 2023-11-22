const objectHash = require("object-hash");
const globals = require("./../globals");
const zlib = require("node:zlib");
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
} = require('./fs_util');

function isInit() {
  for (let dir of globals.baseDirs) {
    if (!pathExists(dir)) {
      console.log(dir + " is missing");
      return false;
    }
  }

  for (let file of globals.baseFiles) {
    if (!pathExists(file)) {
      console.log(file + " is missing");
      return false;
    }
  }
  return true;
}

function createObjectFromFileContent(fileContent) {
  let fileHash = hash(fileContent);
  createDir(globals.objectDir + fileHash.slice(0, 2));
  let filePath = `${globals.objectDir}${fileHash.slice(0, 2)}/${fileHash.slice(
    2
  )}`;
  createEmptyFile(filePath);
  let compressedFile = compress(fileContent);
  writeToFile(filePath, compressedFile, "utf-8");
}

function debug(...inp) {
  console.log(...inp);
}

function logMessage(msg) {
  console.log(msg);
}

function setRootDir(path) {
  globals.rootDir = path;
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


function createCommitStr(treeHash,mergeParent = null) {
    let commitStr = "";
    let time = new Date();
    time = time.getTime();
    commitStr += `tree ${treeHash}\n`;
    if(mergeParent == null){
      let parentCommit = getLastCommit();
      if (parentCommit) commitStr += `parent ${parentCommit}\n`;
    }
    else{
      commitStr += `parent ${mergeParent.currCommit}\n`;
      commitStr += `parent ${mergeParent.incomingCommit}\n`;
    }
    commitStr += `author ${globals.username} <${globals.email}> ${time}\n`;
    commitStr += `committer ${globals.username} <${globals.email}> ${time}\n`;
    commitStr += `\n`;
    commitStr += `${globals.commitMessage}\n`;
    return commitStr;
  } 

function updateRefsWithCommit(commitStr) {
  let head = readFile(".legit/HEAD");
  let branch = "";
  if (head.split(" ")[0] != "ref:") throw "can't commit in detached state";
  branch = head.split(" ")[1];
  branch = ".legit/" + branch;
  if (!(pathExists(branch) && isFile(branch))) createEmptyFile(branch);
  writeToFile(branch, hash(commitStr));
}

function getObjectFromHash(objectHash) {
  let filePath = `${globals.objectDir}${objectHash.slice(
    0,
    2
  )}/${objectHash.slice(2)}`;
  return decompress(readFile(filePath, null));
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

function getBranches() {
  return listPathsInDir(globals.headsDir.slice(0, -1)).filter(
    (path) => {
      return isFile(globals.headsDir + path);
    }
  );
}

function fullCommitHash(partialHash) {
  // limit of characters needed: 3
  let hashDir = globals.objectDir + partialHash.slice(0, 2);
  let restOfHash = partialHash.slice(2);
  if (pathExists(hashDir)) {
    let objects = listPathsInDir(hashDir);
    let matches = objects.filter((obj) => {
      return obj.slice(0, restOfHash.length) == restOfHash;
    });
    if (matches.length == 0) {
      return "";
    } else if (matches.length > 1) {
      console.log("ambiguous commit hash, provide longer hash");
      return "";
    } else {
      return partialHash.slice(0, 2) + matches[0];
    }
  } else return "";
}  

function getCurrentBranch() {
  let head = readFile(".legit/HEAD").split("\n")[0].split(" ");
  if (head.length == 1) return false;
  let ref = head.slice(-1)[0];
  return ref.split("/").slice(2).join("/");
}

function parseCommit(commitHash) {
  let file = getObjectFromHash(commitHash).split("\n");
  let commitDetails = {};
  for(let line = 0; line<file.length; line++){
    if(file[line]=='') {
      commitDetails['message'] = file.slice(line+1,-1).join('\n');
      break;
    }
    let key = file[line].split(" ")[0];
    let value = file[line].split(" ")[1];
    commitDetails[key]=value;
  }
  return commitDetails;
}

function setUpGlobals() {
  let currDir = process.cwd().replace(/\\/g, "/").split("/");
  let parentsDepth = currDir.length - 1;
  let rootDir = "./";
  let fromLast = 0;
  while (
    parentsDepth!=0 &&
    !(pathExists(rootDir + ".legit") && isDir(rootDir + ".legit"))
  ) {
    parentsDepth--;
    rootDir += "../";
    fromLast++;
  }
  if (parentsDepth <= 0) {
    console.log(parentsDepth);
    console.log("git repository not initialised");
    process.exit();
  }
  globals.rootDir = rootDir;
  if (fromLast != 0)
    globals.rootToWorkingPath = currDir.slice(-fromLast).join("/") + "/";
  globals.commitFileCommand = `code -w ${globals.rootDir + ".legit/COMMIT_EDITMSG"}`;
}

function isDetached() {
  let head = readFile(".legit/HEAD");
  return head.split(" ")[0] != "ref:";
}

module.exports = {
  isInit,
  createObjectFromFileContent,
  debug,
  logMessage,
  setRootDir,
  hash,
  compress,
  decompress,
  createCommitStr,
  getObjectFromHash,
  getLastCommit,
  updateRefsWithCommit,
  formatTimestamp,
  getBranches, 
  fullCommitHash,
  getCurrentBranch,
  parseCommit,
  setUpGlobals,
  isDetached
};