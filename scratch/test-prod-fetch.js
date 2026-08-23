(async () => {
  const loginRes = await fetch('https://nexora-rp09.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({username: 'keshava@5', password: 'admin'})
  });
  
  let cookie = loginRes.headers.get('set-cookie')?.split(';')[0];
  console.log("Login:", loginRes.status, await loginRes.text());
  
  const headers = cookie ? { 'Cookie': cookie } : {};
  
  const endpoints = [
    '/api/submissions?status=pending&page=1&limit=20',
    '/api/submissions?status=pending'
  ];
  
  for (const ep of endpoints) {
    const res = await fetch('https://nexora-rp09.onrender.com' + ep, { headers });
    console.log(`\nEndpoint: ${ep}`);
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${(await res.text()).substring(0, 500)}`);
  }
})();
