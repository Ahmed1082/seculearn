const API_BASE_URL = 'https://cary-nontumorous-unimpedingly.ngrok-free.dev';
const token = '9|ziLa2JTIfjcAvCtdonBvyaKo6sTy3WkKIr3fRCFkb486eb64';

async function run() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/student/assignments-tracker`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
        'Accept': 'application/json'
      }
    });
    const data = await res.json();
    console.log("Keys:", Object.keys(data));
    if (data.student) console.log("student:", data.student);
    if (data.user) console.log("user:", data.user);
  } catch (err) {
    console.error(err);
  }
}

run();
