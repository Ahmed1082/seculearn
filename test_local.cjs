const fs = require('fs');
const path = require('path');
const http = require('http');

const chromeProfiles = [
  'c:\\Users\\badr\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Local Storage\\leveldb',
  'c:\\Users\\badr\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\Local Storage\\leveldb'
];
const localBase = 'http://localhost:5173';

const tempDir = path.join(__dirname, 'temp_leveldb');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

function findJWTTokens() {
  const tokens = new Set();
  
  for (const leveldbDir of chromeProfiles) {
    if (!fs.existsSync(leveldbDir)) continue;
    
    const files = fs.readdirSync(leveldbDir);
    for (const file of files) {
      if (file.endsWith('.ldb') || file.endsWith('.log')) {
        const srcPath = path.join(leveldbDir, file);
        const destPath = path.join(tempDir, file);
        try {
          fs.copyFileSync(srcPath, destPath);
          const content = fs.readFileSync(destPath, 'utf8');
          const matches = content.match(/eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g);
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

function testLocalToken(token, index) {
  return new Promise((resolve) => {
    const url = `${localBase}/api/get-courses`;
    const options = {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 2000
    };
    
    const req = http.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          index,
          statusCode: res.statusCode,
          response: data.slice(0, 150)
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ index, error: 'Timeout' });
    });

    req.on('error', err => {
      resolve({ index, error: err.message });
    });
  });
}

async function run() {
  const tokens = findJWTTokens();
  console.log(`Found ${tokens.length} tokens. Testing locally...`);
  
  for (let i = 0; i < tokens.length; i++) {
    const res = await testLocalToken(tokens[i], i);
    console.log(`Token ${i} Local Status:`, JSON.stringify(res, null, 2));
  }
}

run();
