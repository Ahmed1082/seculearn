const fs = require('fs');
const http = require('http');

const token = '9|ziLa2JTIfjcAvCtdonBvyaKo6sTy3WkKIr3fRCFkb486eb64';
const localBase = 'http://localhost:5173';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = `${localBase}${path}`;
    const options = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'bypass-tunnel-reminder': 'true'
      },
      timeout: 5000
    };
    
    const req = http.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.on('error', err => {
      reject(err);
    });
  });
}

async function run() {
  try {
    const res = await makeRequest('/api/student/quiz/18/my-result');
    console.log("RESULT FOR QUIZ 18:");
    console.log(JSON.stringify(JSON.parse(res.data), null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
