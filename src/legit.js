// imports
const fs = require('fs');
const objectHash = require('object-hash');
const zlib = require('node:zlib');
const path = require('path'); 

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

// util functions
function debug(inp){
    console.log(inp);
}

function logMessage(msg){
    console.log(msg);
}

function createEmptyFile(path){
    fs.closeSync(fs.openSync(workingDir+path, 'w'));
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
    return fs.statSync(workingDir+path).isDirectory();
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
        if(!pathExists(dir)) return false;
    }

    for(let file of baseFiles){
        if(!pathExists(file)) return false;
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
    const objectDir = '.legit/objects/';
    
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

function addAll(){
    // get paths of all the files in diectory,
    if(!isInit()) {
        logMessage(".legit files missing")
        return;
    }
    const paths = fs.readdirSync(workingDir, { recursive: true});
    let files = paths.map(file=>file.replace(/\\/g,'/')).filter(file=>{
        // check if is a file & it isn't in .legit folder
        return isFile(file) && file.slice(0,7)!=".legit/";   
    })
    debug(files);
    add(files);
}

//legit commit
const commit = () => {
    // make tree
    let indexFiles = readFile(INDEX)
                        .split('\n')
                        .filter(line=>line.length!=0)
                        .map(line=>{
                            let [hash,path] = line.split(" ");
                            return {
                                hash,path
                            }
                        });
    debug(indexFiles);
    
    // make commit obj
    // add commit hash to whatever file HEAD is pointing to
}

commit();