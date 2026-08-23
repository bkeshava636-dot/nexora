const https = require('https');

https.get('https://nexora-bk.vercel.app/admin/pyqs', (res) => {
  let html = '';
  res.on('data', d => html += d);
  res.on('end', () => {
    const match = html.match(/<script type="module" crossorigin src="(.*?)">/);
    if (match) {
      https.get('https://nexora-bk.vercel.app' + match[1], (res2) => {
        let js = '';
        res2.on('data', d => js += d);
        res2.on('end', () => {
          const urls = js.match(/https:\/\/[^"'\s]+/g);
          if (urls) {
            const unique = [...new Set(urls)];
            console.log("URLs found in JS bundle:");
            unique.forEach(u => console.log(u));
          }
        });
      });
    } else {
      console.log("No script tag found.");
    }
  });
});
