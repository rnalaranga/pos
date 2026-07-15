const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir);

files.forEach(f => {
  if (f.endsWith('.tsx') && f !== 'Suppliers.tsx') { // Already fixed Suppliers
    const p = path.join(dir, f);
    let content = fs.readFileSync(p, 'utf8');
    if (content.includes('className="fixed inset-0')) {
      content = content.replace(/className="fixed inset-0/g, 'className="absolute inset-0 rounded-b-xl');
      fs.writeFileSync(p, content);
      console.log('Updated ' + f);
    }
  }
});
