import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceRoot = path.join(__dirname, '..');
const targetDirs = [
  path.join(workspaceRoot, 'app'),
  path.join(workspaceRoot, 'components')
];

// Regex to match style objects: key: { ... }
const styleRegex = /\b(\w+)\b\s*:\s*\{([\s\S]*?)\}/g;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // We do replacing using string operations or regex
  const newContent = content.replace(styleRegex, (match, key, body) => {
    // Check if the style contains textTransform: 'uppercase'
    const hasUppercase = body.includes("textTransform: 'uppercase'") || body.includes('textTransform: "uppercase"');
    const hasFontWeight = body.includes('fontWeight:');

    if (hasUppercase && hasFontWeight) {
      modified = true;
      // Remove fontWeight property: fontWeight: ..., or fontWeight: '...'
      const newBody = body.replace(/fontWeight\s*:\s*[^,\n}]+,?/g, '').trimEnd();
      console.log(`Removed fontWeight from [${key}] in ${path.relative(workspaceRoot, filePath)}`);
      return `${key}: {${newBody}}`;
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

console.log('Starting font-weight cleanup for Anton styles...');
for (const dir of targetDirs) {
  console.log(`Scanning: ${dir}`);
  walkDir(dir);
}
console.log('Done!');
