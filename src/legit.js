// imports
const fs = require('fs');
const objectHash = require('object-hash');
const zlib = require('node:zlib');
const path = require('path'); 
const { get } = require('http');

//globals
const workingDir = './../playground/'
const baseDirs = [
    '.legit/refs/heads',
    '.legit/objects'
]
const baseFiles = [
    '.legit/HEAD',
    '.legit/index'
]
const baseRef = 'ref: refs/head/main';
const INDEX = '.legit/index';
const objectDir = '.legit/objects/';
const username = "lemon";
const email = "lemon@hoggy.com";
const commitMessage = "commit 1";

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

function createFolder(path){
    fs.mkdirSync(workingDir+path,{
        recursive:true
    });
}

function writeToFile(path,data,encoding='utf-8'){
    fs.writeFileSync(workingDir+path,data,{
        encoding:encoding,
    })
}

function pathExists(path){
    return fs.existsSync(workingDir+path);
}

function readFile(path,encoding='utf-8'){
    return fs.readFileSync(workingDir+path,{
        encoding:encoding
    })
}

function hash(data,algorithm='sha1'){
    return objectHash(data,{
        algorithm:algorithm
    });
}

function compress(data){
    return zlib.deflateSync(data);
}

function decompress(data){
    return zlib.inflateSync(data);
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

function makeTree(paths,map,cur=''){
    let splits = paths.map(path=>path.split('/')).filter(path=>path.length!=0);
    // ending conditions later
    let root = {};
    for(let [first,...rest] of splits){ 
        if(!Object.keys(root).includes(first)) root[first] = [];
        if(rest.length!=0)
            root[first].push(rest.join("/"));
    }
    for(let key in root){
        if(key=="dem") console.err('demmmmmm');
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
    // {
    //     type: 'tree',
    //     name: 'kama',
    //     children: {
    //         "a":{
    //             name:"a",
    //             type:'blob',
    //             hash:"sdfvg"
    //         },
    //         "b":{
    //             name:"b",
    //             tyep:"tree",
    //             children:{

    //             }
    //         }
    //     }
    // }
    let keys = Object.keys(tree.children); // ["a","b"]
    let treeStr = '';
    // for each child of the current tree node called tree
    // add child's `${type} ${hash} ${name}\n` to tree str
    // if child doesnt have hash, it must be a tree node and you can call this function recursively on it
    for(let key of keys){
        let currNode = tree.children[key];
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

function getParent(){
    let head = readFile('.legit/HEAD');
    let branch = '';
    if(head.split(" ")[0]!='ref:')
        throw "cant commit in detached state";
    branch = head.split(" ")[1];
    branch = '.legit/'+branch;
    if(!(pathExists(branch) && isFile(branch))) {
        createEmptyFile(branch);
        return false;
    }
    let commit = readFile(branch).split('\n')[0];
    if(commit.length==0) return false;
    return commit;
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
            logMessage(dir+" is missing");
            return false;
        }
    }

    for(let file of baseFiles){
        if(!pathExists(file)) {
            logMessage(file+" is missing");
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
        // TODO: make sure to add functionality to check if its file or not, coz this only checks path
        if(!pathExists(filePath)){
            createEmptyFile(filePath);
        }
        // insert the data as a binary
        let compressedFile = compress(fileContent)
        writeToFile(filePath, compressedFile);
    }
    // format and put hashcontentmap inside .legit/index
    let indexContent = '';
    for(let hash in HashToContentMap){
        indexContent += `${hash} ${HashToContentMap[hash]}\n`
    }
    writeToFile(INDEX,indexContent);
}

const addAll = () => {
    // get paths of all the files in diectory,
    if(!isInit()) {
        logMessage(".legit files missing")
        return;
    }
    const ps = fs.readdirSync(workingDir,{recursive:true});
    let files = ps.map(file=>file.replace(/\\/g,'/')).filter(file=>{
        // check if is a file & it isn't in .legit folder
        return isFile(file) && file.slice(0,7)!=".legit/";   
    })
    // debug(files);
    add(files);
}

//legit commit
const commit = () => {
    // make tree
    let fileToHash = {}
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
    }
    // add tree objects to 
    addTreeToObjects(root);
    // console.log(JSON.stringify(tree,null,2));
    // debug(root.hash);
    // make commit obj
    let commitStr = '';
    let time = new Date();
    time = time.getTime();
    commitStr += `tree ${root.hash}\n`;
    let parentCommit = getParent();
    if(parentCommit)
        commitStr += `parent ${parentCommit}\n`;
    commitStr += `author ${username} <${email}> ${time}\n`;
    commitStr += `committer ${username} <${email}> ${time}\n`;;
    commitStr += `\n`;
    commitStr += `${commitMessage}\n`;
    console.log(commitStr);
    // add commit hash to whatever file HEAD is pointing to
    let hashCommit = hash(commitStr);
    let head = readFile('.legit/HEAD');
    let branch = '';
    if(head.split(" ")[0]!='ref:')
        throw "cant commit in detached state";
    branch = head.split(" ")[1];
    branch = '.legit/'+branch;
    if(!(pathExists(branch) && isFile(branch))) {
        createEmptyFile(branch);
    }
    writeToFile(branch, hashCommit);
    // add the commit obj to .legit/objects
    let filePath = `${objectDir}${hashCommit.slice(0,2)}/${hashCommit.slice(2)}`;
    // use this hash a the location, and tree str as the content to create the file.
    createFolder(`${objectDir}${hashCommit.slice(0,2)}`);
    createEmptyFile(filePath);
    writeToFile(filePath, commitStr);
}

addAll();
commit();