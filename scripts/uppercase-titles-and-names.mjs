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

const keysToUppercase = [
  'userName', 'playerName', 'leaderboardName', 'suggestedName', 'feedPlayerName',
  'coachName', 'leagueName', 'pairName', 'cardOpponentName', 'pickerName',
  'sidePlayerName', 'reelPlayerName', 'winnerName', 'followedName', 'cardName',
  'leagueCardName', 'requestName', 'pairNames', 'opponentName', 'title',
  'modalTitle', 'sectionTitle', 'cardTitle', 'welcomeText', 'leagueTileTitle',
  'coachBannerTitle', 'cardTitleText'
];

// Regex to match target style definitions: key: { ... }
const styleRegex = new RegExp(
  `\\b(${keysToUppercase.join('|')})\\b\\s*:\\s*\\{([\\s\\S]*?)\\}`,
  'g'
);

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  const newContent = content.replace(styleRegex, (match, key, body) => {
    // Check if body already has textTransform
    if (body.includes('textTransform:')) {
      return match; // Keep as is
    }
    
    modified = true;
    
    // Check if body has properties, insert textTransform before the closing brace
    const trimmedBody = body.trimEnd();
    const needsComma = trimmedBody.length > 0 && !trimmedBody.endsWith(',');
    
    // Format appropriately: if it's single line, keep it clean; if multiline, keep formatting
    const replacement = `${key}: {${body}${needsComma ? ',' : ''} textTransform: 'uppercase' }`;
    console.log(`Updated [${key}] in ${path.relative(workspaceRoot, filePath)}`);
    return replacement;
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

console.log('Starting stylesheet update for titles and names...');
for (const dir of targetDirs) {
  console.log(`Scanning directory: ${dir}`);
  walkDir(dir);
}
console.log('Done!');
