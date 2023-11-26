const globals = require("./../globals");

const {
  listPathsInDir,
  writeToFile,
  readFile,
  pathExists,
  isFile,
} = require('../util/fs_util');

const {
  isInit,
  createObjectFromFileContent,
  hash
} = require('../util/util');

function addCaller(...args) {
  if (["-A", "--all"].includes(args[0])) {
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
  let files = args.map((file) => {
    return globals.rootToWorkingPath + file;
  });
  for (let file of files) {
    if (!(pathExists(file) && isFile(file))) {
      console.log(`fatal: pathspec '${file}' did not match any files`);
      return;
    }
  }
  add(files);
}

function add(files) {
  let fileToHash = {};
  readFile(globals.indexDir)
  .split("\n")
  .filter(e=>e)
  .forEach(line=>{
    let [fileHash,name] = line.split(' ');
    fileToHash[name] = fileHash;
  })
  
  for (let file of files) {
    let fileContent = readFile(file);
    let fileHash = hash(fileContent);
    
    fileToHash[file] = fileHash;
    
    createObjectFromFileContent(fileContent);
  }
  let indexContent = "";
  for(let file in fileToHash){
    indexContent += `${fileToHash[file]} ${file}\n`;
  }
  writeToFile(globals.indexDir, indexContent);
}

function addAll() {
  let files = listPathsInDir("").filter((file) => {
      return isFile(file) && !isIgnoredFromAdd(file);
  });
  writeToFile(globals.indexDir,"");
  add(files);
}

function isIgnoredFromAdd(file) {
  let ignored = [".legit/"];
  if(pathExists('.legitignore') && isFile('.legitignore'))
    ignored = [...ignored,...readFile('.legitignore').split("\n").filter(e=>e)];
  for(let path of ignored){
    if(file.slice(0,path.length)==path || file.slice(0,path.length+1)==`${path}/`)
      return true;
  }
  return false;
  // return file.slice(0,7) == ".legit/";
}

module.exports = {
  addCaller,
  add,
  addAll, 
  isIgnoredFromAdd
};