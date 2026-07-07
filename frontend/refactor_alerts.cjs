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
      let modified = false;

      if (content.includes('window.confirm(')) {
        content = content.replace(/window\.confirm\((.*?)\)/g, "await useDialogStore.getState().confirm('Confirm', $1)");
        modified = true;
      }

      if (/\balert\(/.test(content)) {
        content = content.replace(/\balert\((.*?)\)/g, "useDialogStore.getState().alert('Message', $1)");
        modified = true;
      }

      if (modified) {
        const relativeToSrc = path.relative(path.dirname(fullPath), srcDir);
        let importPath = path.posix.join(relativeToSrc, 'store/dialogStore').replace(/\\/g, '/');
        if (!importPath.startsWith('.')) importPath = './' + importPath;
        if (importPath === './store/dialogStore') importPath = '../store/dialogStore';

        if (!content.includes('useDialogStore')) {
          content = `import { useDialogStore } from '${importPath}';\n` + content;
        }
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Refactored ${fullPath}`);
      }
    }
  }
}

processDir(srcDir);
console.log('Done refactoring alerts and confirms.');
