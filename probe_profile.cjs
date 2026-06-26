const API_BASE_URL = 'https://cary-nontumorous-unimpedingly.ngrok-free.dev';
const token = '9|ziLa2JTIfjcAvCtdonBvyaKo6sTy3WkKIr3fRCFkb486eb64';

const headers = {
  Authorization: `Bearer ${token}`,
  'ngrok-skip-browser-warning': 'true',
  'Accept': 'application/json'
};

const paths = [
  '/api/user',
  '/api/profile',
  '/api/student/profile',
  '/api/get-profile',
  '/api/me',
  '/api/student/me'
];

async function probe() {
  for (const path of paths) {
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, { headers });
      console.log(`Path: ${path} -> Status: ${res.status}`);
      if (res.status === 200) {
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error(err);
    }
  }
}

probe();
