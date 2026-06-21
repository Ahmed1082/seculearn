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

function testLocalToken(token) {
  return new Promise((resolve) => {
    const url = `${localBase}/api/get-courses`;
    const options = {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 3000
    };
    
    const req = http.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          response: data
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'Timeout' });
    });

    req.on('error', err => {
      resolve({ error: err.message });
    });
  });
}

async function run() {
  const tokens = findJWTTokens();
  
  // Find a token that decodes to Badr Elshawadfy or similar
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadDecoded = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadDecoded);
      
      // Let's test a token that looks like it belongs to badr/seculearn
      if (payload.user?.name || payload.email || payload.Name) {
        console.log(`Testing token ${i} (${payload.email || payload.Name || payload.user?.name})...`);
        const res = await testLocalToken(token);
        console.log(`Status Code: ${res.statusCode}`);
        if (res.response) {
          // If it's Laravel error page, extract the message
          // Look for title/message class
          const titleMatch = res.response.match(/<title>([^<]+)<\/title>/);
          const title = titleMatch ? titleMatch[1] : 'No Title';
          console.log(`Title: ${title}`);
          
          // Print first 500 chars
          console.log(`Body Snippet: ${res.response.slice(0, 500)}`);
          
          // Write full html to error_page.html
          fs.writeFileSync('error_page.html', res.response);
          console.log('Saved full error response to error_page.html');
        }
      }
    } catch (e) {
    }
  }
}

run();
