const { exec } = require('child_process');
const child = exec(`node C:/Users/udith/Projects/leGit/src/legit.js ${process.argv.slice(2).join(" ")}`);
child.stdout.on('data',(data)=>{
    process.stdout.write(data);
})
child.stderr.on('data',(data)=>{
    process.stderr.write(data);
})
