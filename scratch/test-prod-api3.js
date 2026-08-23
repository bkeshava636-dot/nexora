const https = require('https');

async function doFetch(url, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        data: data
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  const loginRes = await doFetch('https://nexora-rp09.onrender.com/api/auth/login', 'POST', JSON.stringify({username: 'keshava@5', password: 'admin'}), {'Content-Type': 'application/json'});
  
  let cookie = '';
  if (loginRes.headers['set-cookie']) {
    cookie = loginRes.headers['set-cookie'][0].split(';')[0];
  }
  
  console.log("Login:", loginRes.status, loginRes.data);
  
  const headers = cookie ? { 'Cookie': cookie } : {};
  
  const endpoints = [
    '/api/semester-qps?isPublished=all',
    '/api/semester-qp-departments?includeInactive=true',
    '/api/ia-papers?isPublished=all',
    '/api/ia-departments?includeInactive=true',
    '/api/submissions?status=pending&page=1&limit=20',
    '/api/submissions?status=pending'
  ];
  
  for (const ep of endpoints) {
    const res = await doFetch('https://nexora-rp09.onrender.com' + ep, 'GET', null, headers);
    console.log(`\nEndpoint: ${ep}`);
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.data.substring(0, 500)}`);
  }
})();
