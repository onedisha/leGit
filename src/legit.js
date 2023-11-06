// imports
const fs = require('fs');
const objectHash = require('object-hash');
const zlib = require('node:zlib');
const path = require('path');

//globals
const workingDir = './../playground/';
const baseDirs = [
    '.legit/refs/heads',
    '.legit/objects'
];
const baseFiles = [
    '.legit/HEAD',
    '.legit/index'
];
const baseRef = 'ref: refs/heads/main';
const INDEX = '.legit/index';
const objectDir = '.legit/objects/';
const username = 'lemon';
const email = 'lemon@hoggy.com';
let commitMessage = 'commit 2';
const yellowColor = "\x1b[33m";
const resetColor = "\x1b[0m";

// util functions
function debug(...inp){
    console.log(...inp);
}

function logMessage(msg){
    console.log(msg);
}

function createEmptyFile(path){
    try{
        fs.closeSync(fs.openSync(workingDir+path, 'w'));
    }
    catch(err){
        console.log(err);
    }
}

function deleteFile(path){
    fs.rmSync(workingDir+path,{
        force:true
    })
}

function deleteFolder(path){
    fs.rmSync(workingDir+path,{
        force:true,
        recursive:true
    })
}

function createFolder(path){
    fs.mkdirSync(workingDir+path,{
        recursive:true
    });
}

function writeToFile(path,data,encoding='utf-8'){
    fs.writeFileSync(workingDir+path,data,{
        encoding:encoding,
    });
}

function readFile(path,encoding='utf-8'){
    return fs.readFileSync(workingDir+path,{
        encoding:encoding
    })
}

function pathExists(path){
    return fs.existsSync(workingDir+path);
}

function isFile(path){
    return fs.statSync(workingDir+path).isFile();
}

function isDirectory(path){
    try {
        return fs.statSync(workingDir+path).isDirectory();
    }
    catch(err){
        return false;
    }
}

function hash(data,algorithm='sha1'){
    return objectHash(data,{
        algorithm:algorithm
    });
}

function compress(data){
    return data;
    // return zlib.deflateSync(data);
}

function decompress(data){
    return data;
    // console.log(data);
    // let ret = zlib.inflateSync(data);
    // console.log(ret);
    // return ret;
}

function makeTree(paths,map,cur=''){
    let splits = paths.map(path=>path.split('/')).filter(path=>path.length!=0);
    let root = {};
    for(let [first,...rest] of splits){ 
        if(!Object.keys(root).includes(first)) root[first] = [];
        if(rest.length!=0) root[first].push(rest.join("/"));
    }
    for(let key in root){
        if(isDirectory(cur+"/"+key) && root[key].length!=0){
            root[key] = {
                type:'tree',
                name:key,
                children: makeTree(root[key],map,cur+"/"+key)
            }
        }
        else {
            root[key] = {
                hash: map[`${cur}/${key}`.slice(1)],
                name: key,
                type: 'blob'
            }
        }
    }
    return root;
}

function addTreeToObjects(tree){
    let children = Object.keys(tree.children); 
    let treeStr = '';
    // for each child of the current tree node called tree
    // add child's `${type} ${hash} ${name}\n` to tree str
    // if child doesnt have hash, it must be a tree node and you can call this function recursively on it
    for(let child of children){
        let currNode = tree.children[child];
        if(currNode.type !== 'blob')  addTreeToObjects(currNode);
        treeStr += `${currNode.type} ${currNode.hash} ${currNode.name}\n`;
    }
    // after the for loop, take the final tree str as content and find its hash
    let hashTree = hash(treeStr);
    // this is the hash of tree object, now, we need to make an actual tree objects at .legit/objects/
    let filePath = `${objectDir}${hashTree.slice(0,2)}/${hashTree.slice(2)}`;
    // use this hash a the location, and tree str as the content to create the file.
    createFolder(`${objectDir}${hashTree.slice(0,2)}`);
    createEmptyFile(filePath);
    writeToFile(filePath, treeStr);
    // return the hash for the caller of the function to use
    tree.hash = hashTree;
}   

function getLastCommit(){
    let head = readFile('.legit/HEAD');
    let branch = '';
    if(head.split(" ")[0]!='ref:') throw "cant commit in detached state";
    branch = head.split(" ")[1];
    branch = '.legit/'+branch;
    if(!(pathExists(branch) && isFile(branch))) return false;
    let commit = readFile(branch).split('\n')[0];
    if(commit.length==0) return false;
    return commit;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
  
    const options = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
      timeZoneOffset: 'numeric',
    };
  
    const formattedDate = date.toLocaleString('en-US', options);
    return formattedDate; 
}
  
function logCommit(file, commitHash){
    let author = file[1].split(" ")[1];
    let timestamp = file[1].split(" ")[3];
    let commitMsg = file[4];
    if(file[1].split(" ")[0] != "author"){ //if parent exists
        author = file[2].split(" ")[1];
        timestamp = file[2].split(" ")[3];
        commitMsg = file[5];
    }
    console.log(`${yellowColor}commit ${commitHash}${resetColor}`);
    console.log("Author:", author);
    console.log("Date:", formatTimestamp(parseInt(timestamp)));
    console.log(`\n${commitMsg}\n`);
}

function getObjectFromHash(objectHash){
    let filePath = `${objectDir}${objectHash.slice(0,2)}/${objectHash.slice(2)}`;
    return readFile(filePath);
}

function updateTrees(currTreeHash, nextTreeHash, currDir=""){
    let currTree = [];
    let nextTree = [];
    if(currTreeHash!=""){
        getObjectFromHash(currTreeHash).split('\n').filter(e=>e).forEach(line=>{
            let [type,hash,name] = line.split(" ");
            currTree.push({
                type,
                name,
                hash
            })
        });
    }
    getObjectFromHash(nextTreeHash).split('\n').filter(e=>e).forEach(line=>{
        let [type,hash,name] = line.split(" ");
        nextTree.push({
            type,
            name,
            hash
        });
    });
    console.log(currTree, nextTree);
    let getPath = (nodename) =>{
        let str = currDir +'/'+nodename;
        return str.slice(1);
    }
    // if blob
    // if name in new and name not in old -> create file and fill file with contents(via hash)
    // if name in old and not in new -> delete file
    // if name in both && hash is not same -> update contents with hash found in new
    let oldblobs = currTree.filter(node=>node.type=="blob");
    let newblobs = nextTree.filter(node=>node.type=="blob");
    for(let newblob of newblobs){
        if(oldblobs.filter(obj => {
            return obj.name == newblob.name;
        }).length === 0){
            createEmptyFile(getPath(newblob.name));
            writeToFile(getPath(newblob.name), decompress(getObjectFromHash(newblob.hash)));
        }
        else if(oldblobs.filter(obj => {
            return obj.name == newblob.name && obj.hash !== newblob.hash;
        }).length > 0){
            writeToFile(getPath(newblob.name), decompress(getObjectFromHash(newblob.hash)));
        }
    }

    for(let oldblob of oldblobs){
        if(newblobs.filter(obj => {
            return obj.name == oldblob.name;
        }).length === 0){
            deleteFile(getPath(oldblob.name));
        }
    }
    
    // if tree
        // if name in new and name not in old -> create folder and call the updateTree recursively , currDir = currDir+name
        // if name in old and not in new -> delete folder
        // if name in both && hash is not same -> call the updateTree recursively , currDir = currDir+name
    let oldtrees = currTree.filter(node=>node.type=="tree");
    let newtrees = nextTree.filter(node=>node.type=="tree");
    for(let newtree of newtrees){
        if(oldtrees.filter(obj => {
            return obj.name == newtree.name;
        }).length === 0){
            createFolder(getPath(newtree.name));
            // recursively create contents of folder newtree.name
            updateTrees("",newtree.hash,currDir+"/"+newtree.name);
        }

        else if(oldtrees.filter(obj => {
            return obj.name == newtree.name && obj.hash !== newtree.hash;
        }).length > 0){
            let nextArg = oldtrees.filter(obj => {
                return obj.name == newtree.name && obj.hash !== newtree.hash;
            })[0].hash;
            console.log(nextArg);
            updateTrees(nextArg,newtree.hash,currDir+"/"+newtree.name);
        }
    }

    for(let oldtree of oldtrees){
        if(newtrees.filter(obj => {
            return obj.name == oldtree.name
        }).length === 0){
            deleteFile(getPath(oldtree.name));
        }
    }
}

// legit init
// creates the basic files and folders necessary to initialise a repository
const init = () => {
    for(let dir of baseDirs){ 
        createFolder(dir);
    }
    for(let file of baseFiles){
        createEmptyFile(file);
    }
    writeToFile('.legit/HEAD', baseRef);
}

const isInit = () => {
    for(let dir of baseDirs){
        if(!pathExists(dir)) {
            logMessage(dir + " is missing");
            return false;
        }
    }

    for(let file of baseFiles){
        if(!pathExists(file)) {
            logMessage(file + " is missing");
            return false;
        }
    }
    return true;
}

//legit add
const add = (files) => {
    if(!isInit()) {
        logMessage(".legit files missing")
        return;
    }
    const HashToContentMap = {};
    
    for(let file of files){
        // find hash of file content
        let fileContent = readFile(file);
        let fileHash = hash(fileContent);
        // add it to hashtocontentmap
        HashToContentMap[fileHash] = file;

        // create file for it with the hash as the path
        //create a folder inside .legit/objects
        createFolder(objectDir+fileHash.slice(0,2));
        //create emptyfile if not exists
        let filePath = `${objectDir}${fileHash.slice(0,2)}/${fileHash.slice(2)}`;
        if(!(pathExists(filePath) && isFile(filePath))) createEmptyFile(filePath);
        // insert the data as a binary
        let compressedFile = compress(fileContent);
        writeToFile(filePath, compressedFile);
    }
    // format and put hashcontentmap inside .legit/index
    let indexContent = '';
    for(let hash in HashToContentMap){
        indexContent += `${hash} ${HashToContentMap[hash]}\n`;
    }
    writeToFile(INDEX, indexContent);
}

const addAll = () => {
    // get paths of all the files in diectory,
    if(!isInit()) {
        logMessage(".legit files missing");
        return;
    }
    const paths = fs.readdirSync(workingDir,{recursive:true});
    let files = paths.map(file=>file.replace(/\\/g,'/')).filter(file=>{
        // check if is a file & it isn't in .legit folder
        return isFile(file) && file.slice(0,7)!=".legit/";   
    })
    // debug(files);
    add(files);
}

//legit commit
const commit = () => {
    // make tree
    let fileToHash = {};
    let indexFiles = readFile(INDEX)
                        .split('\n')
                        .filter(line=>line.length!=0)
                        .map(line=>{
                            let [hash,path] = line.split(" ");
                            fileToHash[path] = hash;
                            return path;
                        })
                        .sort();
    let tree = makeTree(indexFiles,fileToHash);
    let root = {
        name:'root',
        type:'tree',
        children: tree
    };
    // add tree objects to 
    addTreeToObjects(root);
    // make commit obj
    let commitStr = '';
    let time = new Date();
    time = time.getTime();
    commitStr += `tree ${root.hash}\n`;
    let parentCommit = getLastCommit();
    if(parentCommit) commitStr += `parent ${parentCommit}\n`;
    commitStr += `author ${username} <${email}> ${time}\n`;
    commitStr += `committer ${username} <${email}> ${time}\n`;;
    commitStr += `\n`;
    commitStr += `${commitMessage}\n`;
    // console.log(commitStr);
    // add commit hash to whatever file HEAD is pointing to
    let hashCommit = hash(commitStr);
    let head = readFile('.legit/HEAD');
    let branch = '';
    if(head.split(" ")[0]!='ref:')
        throw "cant commit in detached state";
    branch = head.split(" ")[1];
    branch = '.legit/'+branch;
    if(!(pathExists(branch) && isFile(branch))) createEmptyFile(branch);  
    writeToFile(branch, hashCommit);
    // add the commit obj to .legit/objects
    let filePath = `${objectDir}${hashCommit.slice(0,2)}/${hashCommit.slice(2)}`;
    // use this hash a the location, and tree str as the content to create the file.
    createFolder(`${objectDir}${hashCommit.slice(0,2)}`);
    createEmptyFile(filePath);
    writeToFile(filePath, commitStr);
    return hashCommit;
}

const log = () => {
    // get latest commit and console log its details
    //details: commit hash, author, date, message
    let lastCommit = getLastCommit();
    if(!lastCommit){
        console.log("You haven't committed anything");
        return;
    }
    let filePath = `${objectDir}${lastCommit.slice(0,2)}/${lastCommit.slice(2)}`;
    let file = readFile(filePath).split('\n');
    let parent = file[1].split(" ")[0];
    // find parent if it has and do the same until the first commit
    while(parent === "parent"){
        logCommit(file,lastCommit);
        lastCommit = file[1].split(" ")[1];
        filePath = `${objectDir}${lastCommit.slice(0,2)}/${lastCommit.slice(2)}`;
        file = readFile(filePath).split('\n');
        parent = file[1].split(" ")[0];
    }
    logCommit(file,lastCommit);
}

const checkoutCommit = (commitHash) => {
    // change the .legit/head to given commitHash
    // while testing
    writeToFile('.legit/HEAD','ref: refs/heads/main');
    //
    let currCommit = getLastCommit();
    writeToFile(".legit/HEAD", commitHash);
    // get the current and next trees where next tree is the tree we are going to checkout
    let filePath = `${objectDir}${currCommit.slice(0,2)}/${currCommit.slice(2)}`;
    let currTreeHash = readFile(filePath).split('\n')[0].split(" ")[1];
    filePath = `${objectDir}${commitHash.slice(0,2)}/${commitHash.slice(2)}`;
    let nextTreeHash = readFile(filePath).split('\n')[0].split(" ")[1];
    updateTrees(currTreeHash,nextTreeHash);
    // if there is a file that is in current and not present in next, delete it, 
    // while deleting if parent folder becomes empty, delete that also
    // if there is a file in next not present in current, create it and then populate files accordingly
    // replace the content in files whose hash has changed
}

function testing(){
    // init
    // if(pathExists('.legit')) return;
    init();
    // first commit will have
    // /a
    //     /b.js -> console.log("first commit");
    //     /c.txt -> this is a text file of first commit
    // /d
    //     /e.py -> python for ML
    // /f.md / -> first commit
    createFolder('a');
    createEmptyFile('a/b.js');
    writeToFile('a/b.js','console.log("first commit");')
    createEmptyFile('a/c.txt');
    writeToFile('a/c.txt','this is a text file of first commit')
    createFolder('d');
    createEmptyFile('d/e.py');
    writeToFile('d/e.py','python for ML');
    createEmptyFile('f.md');
    writeToFile('f.md',"first commit");
    createFolder('newbi');
    createEmptyFile('newbi/bi');
    writeToFile('newbi/bi',"Hello this proves checkout works 100%");

    addAll();
    commitMessage = "fist commit";
    let ret = commit();

    // second commit will have 
    // /a
    //     /b.js -> console.log("second commit");
    //     /p.kt -> "this is a new file for second commit"
    // /d
    //     /e.py -> python for ML
    // /g.md / -> first commit
    writeToFile('a/b.js','console.log("second commit");')
    createEmptyFile('a/p.kt');
    writeToFile('a/p.kt','"this is a new file for second commit"');
    deleteFile('a/c.txt');
    deleteFile('f.md');
    createEmptyFile('g.md');
    writeToFile('g.md',"first commit");
    deleteFolder('newbi');
    addAll()
    commitMessage = "second commit bro";
    commit()
    // log
    log()
    // returns first commit for test purposes

    return ret;
}

// 316b50f88eb1c58c436ba9290bb4dac1722b380a
// 4f9d1c4c94a72881f28f03127c2edef752fabbcb

deleteFolder("");
let chCommit = testing();
setTimeout(()=>{
    checkoutCommit(chCommit);
},5000);