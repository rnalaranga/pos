const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      if (content.includes('useDialogStore') && !content.includes("import { useDialogStore }")) {
        const relativeToSrc = path.relative(path.dirname(fullPath), srcDir);
        let importPath = path.posix.join(relativeToSrc, 'store/dialogStore').replace(/\\/g, '/');
        if (!importPath.startsWith('.')) importPath = './' + importPath;
        if (importPath === './store/dialogStore') importPath = '../store/dialogStore';

        content = `import { useDialogStore } from '${importPath}';\n` + content;
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed imports in ${fullPath}`);
      }
    }
  }
}

processDir(srcDir);
