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
            statusCode: res.statusCode,
            data: JSON.parse(data)
          });
        } catch {
          resolve({
            statusCode: res.statusCode,
            error: 'Not JSON',
            raw: data.slice(0, 200)
          });
        }
      });
    });

    req.on('error', err => resolve({ error: err.message }));
  });
}

async function run() {
  console.log('Testing instructor challenges filtering with course_id query params...');
  const resNoParam = await fetchChallenges('/api/get-my-challenges');
  console.log('No param challenge count:', resNoParam.data?.data?.length || 0);

  // Let's test with course_id=1, course_id=2, course_id=3
  const resCourse1 = await fetchChallenges('/api/get-my-challenges?course_id=1');
  const resCourse2 = await fetchChallenges('/api/get-my-challenges?course_id=2');
  const resCourse3 = await fetchChallenges('/api/get-my-challenges?course_id=3');

  console.log('Course 1 challenge count:', resCourse1.data?.data?.length || 0);
  console.log('Course 2 challenge count:', resCourse2.data?.data?.length || 0);
  console.log('Course 3 challenge count:', resCourse3.data?.data?.length || 0);

  if (resCourse1.data?.data) {
    console.log('Course 1 titles:', resCourse1.data.data.map(c => c.title));
  }
  if (resCourse2.data?.data) {
    console.log('Course 2 titles:', resCourse2.data.data.map(c => c.title));
  }
  if (resCourse3.data?.data) {
    console.log('Course 3 titles:', resCourse3.data.data.map(c => c.title));
  }
  
  console.log('\nTesting student challenges filtering...');
  const resStudentNoParam = await fetchChallenges('/api/student/get-ctf-challenges');
  const resStudentCourse1 = await fetchChallenges('/api/student/get-ctf-challenges?course_id=1');
  const resStudentCourse2 = await fetchChallenges('/api/student/get-ctf-challenges?course_id=2');
  const resStudentCourse3 = await fetchChallenges('/api/student/get-ctf-challenges?course_id=3');
  
  console.log('Student No param count:', resStudentNoParam.data?.data?.length || 0);
  console.log('Student Course 1 count:', resStudentCourse1.data?.data?.length || 0);
  console.log('Student Course 2 count:', resStudentCourse2.data?.data?.length || 0);
  console.log('Student Course 3 count:', resStudentCourse3.data?.data?.length || 0);
}

run();
