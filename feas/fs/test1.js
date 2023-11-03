const fs = require('fs');
// const directoryPath = 'newDirectory';

// try {
//   // Create the directory synchronously
//   fs.mkdirSync(directoryPath);
//   console.log('Directory created successfully.');
// } catch (err) {
//   console.error('Error creating directory:', err);
// }

const directoryPath = 'newDirectory';
const filePath = `${directoryPath}/example.txt`;

// const fileContent = 'Hello, Node.js!';

// fs.writeFile(filePath, fileContent, (err) => {
//   if (err) {
//     console.error('Error creating file:', err);
//   } else {
//     console.log('File created successfully.');
//   }
// });

// const filePath = 'example.txt';

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
  } else {
    console.log('File content:', data);
  }
});