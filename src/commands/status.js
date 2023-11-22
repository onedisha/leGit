// function status(){
//   if(!isInit()){
//     console.log("error: .legit not initialised");
//     return;
//   }

//   let currBranch = getCurrentBranch();
//   if(!currBranch){
//       let commitHash = readFile(".legit/HEAD").slice(0, 7); 
//       let message = parseCommit(commitHash).message;
//       console.log(`HEAD detached at ${commitHash} ${message}`);
//   }
//   else{
//     console.log(`On branch ${currBranch}`);
//   }

//   let commitFiles = listPathsInDir(globals.objectDir).filter((file) => {
//     return isFile(file); //stores commit hashes
//   });
//   let workingDirFiles = listPathsInDir("").filter((file) => {
//     return isFile(file) && !isIgnoredFromAdd(file);
//   }); // stores files in working dir
//   let indexFiles = readFile(globals.indexDir).split("\n").filter((line) => line.length != 0).map((line) => {
//     let [hash, path] = line.split(" ");
//     return path;
//   }); // stores files staged

//   if(commitFiles.length == 0) console.log("No commits yet");

//   if(workingDirFiles.length == 0 && commitFiles.length == 0 && indexFiles.length == 0){
//     console.log("nothing to commit (create/copy files and use 'git add' to track)");
//     return;
//   }

//   let X = CvW(); //* Rename : array representing changes bw lastcommit and working dir
//   let Y = CvsI(); //* Rename : array representing changes bw lastCommit and staged files
//   let Z = IvsW(); //* Rename : array representing changes bw index files and working dir
//   if(indexFiles.length == 0 && X.length == 0){
//     console.log("nothing to commit, working tree clean");
//     return;
//   }
  
//   if(indexFiles.length > 0){
//     console.log("Changes to be commited:");
//     //*console.log(in green : newfiles, modififed, deleted based on Y);
//   }

//   //* console.log("Changes not staged for commit:"); 
//   //! in red: if Z or X has anything in deleted files: console.log("deleted: filename");
//   //! if Z or X has anything in modified files: console.log("modified: filename");
  

//   //* console.log("Untracked files:");
//   //! in red: if Z and X both have it in new files: 
//   //* console.log("  (use "git add <file>..." to include in what will be committed)");
//   //* console.log(filename);
// }

// function getPathFromTree(commitHash){
//   let lastCommit = getLastCommit();
//   if(!lastCommit) return;
//   let tree = parseCommit(lastCommit).tree;
// }

// function compareFiles(object1, object2){

// }

// function hashWorkingDirFiles(){
//   let workingDirFiles = {};
//   let files = listPathsInDir("").filter((file) => {
//     return isFile(file) && !isIgnoredFromAdd(file);
//   });
//   for(let file of files){
//     let h = hash(readFile(file));
//     workingDirFiles[file] = h;
//   }
//   return workingDirFiles;
// }
