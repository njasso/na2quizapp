const fs = require('fs');
const path = require('path');

function printTree(dir, prefix = '', ignore = ['node_modules', '.git']) {
  const items = fs.readdirSync(dir).filter(item => !ignore.includes(item));

  items.forEach((item, index) => {
    const fullPath = path.join(dir, item);
    const isLast = index === items.length - 1;
    const pointer = isLast ? '└─ ' : '├─ ';

    console.log(prefix + pointer + item);

    if (fs.statSync(fullPath).isDirectory()) {
      printTree(fullPath, prefix + (isLast ? '   ' : '│  '), ignore);
    }
  });
}

// Lance depuis la racine du projet
printTree(process.cwd());
