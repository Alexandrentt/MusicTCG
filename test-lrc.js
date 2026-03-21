const https = require('https');
https.get('https://lrclib.net/api/get?artist_name=Coldplay&track_name=Yellow', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data.substring(0, 200)));
});
