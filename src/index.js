const { exec } = require('child_process');
const path = 'C:/Users/udith/Projects/leGit/src/legit.js';
const child = exec(`node ${path} ${process.argv.slice(2).join(" ")}`);
child.stdout.on('data',(data)=>{
    process.stdout.write(data);
})
child.stderr.on('data',(data)=>{
    process.stderr.write(data);
})
