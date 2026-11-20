const https = require('https');
const state = require('C:/Users/jones/.expo/state.json');

const query = JSON.stringify({
  query: `query {
    __type(name: "Build") {
      fields {
        name
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
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(parsed.data.__type.fields.map(f => f.name).join(', '));
    } catch {
      console.log(data);
    }
  });
});

req.write(query);
req.end();
