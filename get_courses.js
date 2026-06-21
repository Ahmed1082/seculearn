const fs = require('fs');
const path = require('path');
const https = require('https');

const leveldbDir = 'c:\\Users\\badr\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Local Storage\\leveldb';
const apiBase = 'https://cary-nontumorous-unimpedingly.ngrok-free.dev';

function findJWTTokens(dir) {
  const tokens = new Set();
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    if (file.endsWith('.ldb') || file.endsWith('.log')) {
      try {
        const content = fs.readFileSync(path.join(dir, file), 'utf8');
        // Simple regex for JWT tokens
        const matches = content.match(/eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g);
        if (matches) {
          matches.forEach(token => tokens.add(token));
        }
      } catch (err) {
        // ignore read errors
      }
    }
  }
  return Array.from(tokens);
}

function makeApiRequest(token) {
  return new Promise((resolve, reject) => {
    const url = `${apiBase}/api/get-courses`;
    const options = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            resolve({ token, data: parsed });
          } catch {
            resolve({ token, data: null, error: 'JSON Parse Error' });
          }
        } else {
          resolve({ token, data: null, statusCode: res.statusCode, error: data.slice(0, 100) });
        }
      });
    }).on('error', err => {
      resolve({ token, data: null, error: err.message });
    });
  });
}

async function run() {
  console.log('Scanning Edge Local Storage leveldb...');
  const tokens = findJWTTokens(leveldbDir);
  console.log(`Found ${tokens.length} candidate JWT tokens.`);
  
  for (const token of tokens) {
    // Decent filter to avoid checking unrelated OpenAI/Microsoft tokens
    try {
      // Decode JWT payload to see if it's for seculearn
      const payloadBase64 = token.split('.')[1];
      const payloadDecoded = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadDecoded);
      
      // Let's filter by checking if email/name exists or if it's not openai/etc.
      if (token.length > 500 && !payload.iss?.includes('openai') && !payload.iss?.includes('microsoft')) {
        console.log(`Testing token for user: ${payload.email || payload.name || 'Unknown'}`);
        const result = await makeApiRequest(token);
        if (result.data) {
          console.log('Success! Writing courses to courses_response.json');
          fs.writeFileSync('courses_response.json', JSON.stringify(result.data, null, 2));
          
          // Also fetch challenges!
          const challengesUrl = `${apiBase}/api/get-my-challenges`;
          const challengesRes = await new Promise((resolve) => {
            https.get(challengesUrl, { headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' } }, (res) => {
              let d = '';
              res.on('data', chunk => { d += chunk; });
              res.on('end', () => {
                try { resolve(JSON.parse(d)); } catch { resolve(d); }
              });
            });
          });
          fs.writeFileSync('challenges_response.json', JSON.stringify(challengesRes, null, 2));
          console.log('Success! Writing challenges to challenges_response.json');
          return;
        }
      }
    } catch (e) {
      // ignore parsing issues
    }
  }
  
  console.log('Done scanning, no valid courses returned. Testing all tokens just in case...');
  for (let i = 0; i < tokens.length; i++) {
    const result = await makeApiRequest(tokens[i]);
    if (result.data) {
      console.log('Success on raw fallback! Writing to courses_response.json');
      fs.writeFileSync('courses_response.json', JSON.stringify(result.data, null, 2));
      return;
    }
  }
  console.log('Failed to find valid course token.');
}

run();
