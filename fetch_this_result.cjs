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
    console.log("Fetching quizzes tracker...");
    const trackerRes = await makeRequest('/api/student/quizzes-tracker');
    const tracker = JSON.parse(trackerRes.data);
    
    console.log("Tracker quizzes count:", tracker.quizzes.length);
    for (const q of tracker.quizzes) {
      if (q.status === 'completed') {
        const resultRes = await makeRequest(`/api/student/quiz/${q.id}/my-result`);
        console.log(`\n--- Quiz ID ${q.id} (${q.title}) result ---`);
        console.log(resultRes.data);
      }
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
