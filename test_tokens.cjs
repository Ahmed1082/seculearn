const fs = require('fs');
const path = require('path');
const https = require('https');

const chromeProfiles = [
  'c:\\Users\\badr\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Local Storage\\leveldb',
  'c:\\Users\\badr\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\Local Storage\\leveldb'
];
const apiBase = 'https://cary-nontumorous-unimpedingly.ngrok-free.dev';

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

function testToken(token, index) {
  return new Promise((resolve) => {
    const url = `${apiBase}/api/get-courses`;
    const options = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
        'bypass-tunnel-reminder': 'true'
      },
      timeout: 2000
    };
    
    let decoded = 'Unparseable';
    try {
      const payloadBase64 = token.split('.')[1];
      decoded = Buffer.from(payloadBase64, 'base64').toString('utf8');
    } catch (e) {}

    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          index,
          statusCode: res.statusCode,
          response: data.slice(0, 100),
          decoded: decoded.slice(0, 150)
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ index, error: 'Timeout', decoded: decoded.slice(0, 150) });
    });

    req.on('error', err => {
      resolve({ index, error: err.message, decoded: decoded.slice(0, 150) });
    });
  });
}

async function run() {
  const tokens = findJWTTokens();
  console.log(`Found ${tokens.length} tokens. Testing...`);
  
  for (let i = 0; i < tokens.length; i++) {
    const res = await testToken(tokens[i], i);
    console.log(`Token ${i}:`, JSON.stringify(res, null, 2));
  }
}

run();
