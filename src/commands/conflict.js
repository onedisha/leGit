const diff = require("diff");

function mergedFile(base,current,incoming){
  let conflict = false;
    
  base = base.replace(/\r\n/g, "\n");
  current = current.replace(/\r\n/g, "\n");
  incoming = incoming.replace(/\r\n/g, "\n");

  let patchConfig = {
    context:3
  }

  let currHunks = diff.structuredPatch("","",base,current,"","",patchConfig).hunks.map(h=>{
    return {
      ...h,
      from:"curr"
    }
  });
  let inHunks = diff.structuredPatch("","",base,incoming,"","",patchConfig).hunks.map(h=>{
    return {
      ...h,
      from:"incoming"
    }
  });

  let hunks = [...currHunks,...inHunks];
  hunks.sort((a,b)=>{
    return a.oldStart<b.oldStart;
  })

  // apply the patch on base.txt
  let oldLines = {};
  base.split("\n").map((val,index)=>{
    oldLines[index+1] = {
      val: val,
      incoming:{},
      curr:{}
    }
  });

  for(let hunk of hunks){
    let start = hunk.oldStart;
    let end = start+hunk.oldLines;
    for(let line of hunk.lines){
      let sw = line[0];
      if(sw==" "){
        // do nothing
        start++;
      }
      if(sw=="+"){
        // 
        if(oldLines[start-1][hunk.from].plus==undefined) oldLines[start-1][hunk.from].plus = [];
        oldLines[start-1][hunk.from].plus.push(line.slice(1));
      }
      if(sw=="-"){
        if(oldLines[start][hunk.from].minus==undefined) oldLines[start][hunk.from].minus = [];
        oldLines[start][hunk.from].minus.push(line.slice(1));
        start++;
      }
    }
  }
  let sz = base.split("\n").length;
  let newLines = [];
  for(let i=1;i<=sz;i++){
    let line = oldLines[i];
    let incomingplus = line.incoming.plus != undefined;
    let incomingminus = line.incoming.minus != undefined;
    let currplus = line.curr.plus != undefined;
    let currminus = line.curr.minus != undefined;

    // plus is add stuff after current line
    // minus is remove current line

    if(!incomingplus && !incomingminus && !currplus && !currminus){
      newLines.push(line.val)
    }
    else if((incomingplus && !currplus && !currminus) || (incomingminus && !currplus && !currminus) && findmaxnum(oldLines,i)==1){
      addchanges(newLines,oldLines,i,1,"incoming");
    }
    else if((currplus && !incomingplus && !incomingminus) || (currminus && !incomingplus && !incomingminus) && findmaxnum(oldLines,i)==1){
      addchanges(newLines,oldLines,i,1,"curr");
    }
    else {
      conflict = true;
      console.log("tsartign to find max");
      let num = findmaxnum(oldLines,i);
      console.log(`found max ${num} at ${i}`);
      newLines.push("<<<<<<< current");
      addchanges(newLines, oldLines, i, num, "curr");
      newLines.push("=======");
      addchanges(newLines, oldLines, i, num, "incoming");
      newLines.push(">>>>>>> incoming");
      i=i+num-1;
    }
  }
  return {
    conflict,
    newContent: newLines.join("\n")
  }
}

function findmaxnum(oldLines,i){
  let line = oldLines[i];
  let incomingplus = line.incoming.plus != undefined;
  let incomingminus = line.incoming.minus != undefined;
  let currplus = line.curr.plus != undefined;
  let currminus = line.curr.minus != undefined;
  let ret = 0;
  console.log(( incomingminus|| incomingplus || currminus || currplus ) && ((i+1) in oldLines));
  while(( incomingminus|| incomingplus || currminus || currplus ) && ((i+1) in oldLines)){
    console.log(i);
    i++;
    line = oldLines[i];
    incomingplus = line.incoming.plus != undefined;
    incomingminus = line.incoming.minus != undefined;
    currplus = line.curr.plus != undefined;
    currminus = line.curr.minus != undefined;
    ret++;
  }
  if(ret==0) return 1;
  return ret;
}

function addchanges(newLines, oldLines, i, num, type){
  while(num--){
    if(oldLines[i][type].minus!=undefined){
      
    }
    else {
      newLines.push(oldLines[i].val);
    }
    if(oldLines[i][type].plus!=undefined){
      oldLines[i][type].plus.forEach(line=> {
        newLines.push(line);
      });
    }
    i++;
  }
}

module.exports = {
  mergedFile
}