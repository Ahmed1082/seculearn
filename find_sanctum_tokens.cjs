const fs = require('fs');
const path = require('path');

const chromeProfiles = [
  'c:\\Users\\badr\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Local Storage\\leveldb',
  'c:\\Users\\badr\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\Local Storage\\leveldb'
];

const tempDir = path.join(__dirname, 'temp_leveldb');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

function findSanctumTokens() {
  const tokens = new Set();
  
  for (const leveldbDir of chromeProfiles) {
    if (!fs.existsSync(leveldbDir)) continue;
    
    console.log(`Scanning profile: ${leveldbDir}`);
    const files = fs.readdirSync(leveldbDir);
    
    for (const file of files) {
      if (file.endsWith('.ldb') || file.endsWith('.log')) {
        const srcPath = path.join(leveldbDir, file);
        const destPath = path.join(tempDir, file);
        try {
          fs.copyFileSync(srcPath, destPath);
          const content = fs.readFileSync(destPath, 'utf8');
          
          // Regex for Laravel Sanctum token: numeric ID, followed by |, followed by 40+ chars
          // Let's use a looser match to capture it: \b[0-9]+\|[A-Za-z0-9]{30,80}\b
          const matches = content.match(/[0-9]+\|[A-Za-z0-9]{30,80}/g);
          if (matches) {
            matches.forEach(token => tokens.add(token));
          }
        } catch (err) {
        } finally {
          try {
            if (fs.existsSync(destPath)) {
              fs.unlinkSync(destPath);
            }
          } catch (e) {}
        }
      }
    }
  }
  
  try {
    fs.rmdirSync(tempDir);
  } catch (e) {}
  
  return Array.from(tokens);
}

const tokens = findSanctumTokens();
console.log('Found Sanctum tokens:', tokens);
if (tokens.length > 0) {
  fs.writeFileSync('sanctum_tokens.json', JSON.stringify(tokens, null, 2));
}
