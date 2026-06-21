const fs = require('fs');
const http = require('http');

const token = '19|dHm6rmlUoxKSSJUmUcyN03verH5W3tR2Xfkw7Rog93a03e83';
const localBase = 'http://localhost:5173';

function fetchChallenges(pathWithQuery) {
  return new Promise((resolve) => {
    const url = `${localBase}${pathWithQuery}`;
    const options = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      timeout: 3000
    };
    
    const req = http.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            path: pathWithQuery,
            statusCode: res.statusCode,
            data: JSON.parse(data)
          });
        } catch {
          resolve({
            path: pathWithQuery,
            statusCode: res.statusCode,
            error: 'Not JSON',
            raw: data.slice(0, 100)
          });
        }
      });
    });

    req.on('error', err => resolve({ path: pathWithQuery, error: err.message }));
  });
}

async function run() {
  const targets = [
    // camelCase params
    '/api/get-my-challenges?courseId=1',
    '/api/get-my-challenges?courseId=2',
    // path params
    '/api/get-my-challenges/1',
    '/api/get-my-challenges/2',
    '/api/get-my-challenges/course/1',
    '/api/get-my-challenges/course/2',
    // Student camelCase params
    '/api/student/get-ctf-challenges?courseId=1',
    '/api/student/get-ctf-challenges?courseId=2',
    // Student path params
    '/api/student/get-ctf-challenges/1',
    '/api/student/get-ctf-challenges/2',
    '/api/student/get-ctf-challenges/course/1',
    '/api/student/get-ctf-challenges/course/2',
  ];

  console.log('Testing alternative query/path formats...');
  for (const target of targets) {
    const res = await fetchChallenges(target);
    if (res.statusCode === 200 && Array.isArray(res.data?.data)) {
      console.log(`Path: ${res.path} -> SUCCESS (200), challenge count: ${res.data.data.length}`);
      console.log(`Titles:`, res.data.data.map(c => c.title));
    } else {
      console.log(`Path: ${res.path} -> Status: ${res.statusCode}. Error: ${res.error || (res.data ? JSON.stringify(res.data) : 'None')}`);
    }
  }
}

run();
