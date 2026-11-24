const https = require('https');
const state = require('C:/Users/jones/.expo/state.json');

const body = JSON.stringify({
  query: `query {
    app {
      byFullName(fullName: "@jowaljones/super-admin") {
        builds(offset: 0, limit: 5) {
          id
          status
          platform
          createdAt
        }
      }
    }
  }`
});

const req = https.request('https://api.expo.dev/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'expo-session': state.auth.sessionSecret
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.stringify(JSON.parse(data), null, 2)));
});
req.write(body);
req.end();
