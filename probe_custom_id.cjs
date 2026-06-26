const API_BASE_URL = 'https://cary-nontumorous-unimpedingly.ngrok-free.dev';
const token = '9|ziLa2JTIfjcAvCtdonBvyaKo6sTy3WkKIr3fRCFkb486eb64';

async function run() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/dr-ta/assignment/10/student/221001606`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
        'Accept': 'application/json'
      }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
