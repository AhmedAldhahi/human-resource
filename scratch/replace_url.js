const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../apps/web/src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk(srcDir);

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('http://localhost:3000')) {
    let newContent = content;

    newContent = newContent.replace(/`http:\/\/localhost:3000\$\{([^}]+)\}`/g, 'getAssetUrl($1)');
    newContent = newContent.replace(/'http:\/\/localhost:3000\/api([^']*)'/g, "getSocketUrl('$1')");
    newContent = newContent.replace(/`http:\/\/localhost:3000\/api([^`]*)`/g, "getSocketUrl(`$1`)");
    newContent = newContent.replace(/'http:\/\/localhost:3000\/chat'/g, "getSocketUrl('/chat')");
    
    if (newContent !== content) {
      if (!newContent.includes('getAssetUrl') && !newContent.includes('getSocketUrl')) {
        // ...
      } else {
        const relativeToSrc = path.relative(path.dirname(file), srcDir);
        let importPath = path.join(relativeToSrc, 'api/client').replace(/\\/g, '/');
        if (importPath === 'api/client') importPath = './api/client';
        else if (!importPath.startsWith('.')) importPath = `./${importPath}`;

        const importStatement = `import { getAssetUrl, getSocketUrl } from '${importPath}';\n`;
        
        if (!newContent.includes('import { getAssetUrl')) {
           newContent = importStatement + newContent;
        }
      }
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
});
