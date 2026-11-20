const https = require('https');
const state = require('C:/Users/jones/.expo/state.json');

const buildId = process.argv[2] || '5cefd454-eff3-4545-a37e-e12756524149';

const body = JSON.stringify({
  query: `query GetBuildLogs($buildId: ID!) {
    builds {
      byId(buildId: $buildId) {
        id
        status
        error {
          message
          errorCode
        }
        logFileUrls
      }
    }
  }`,
  variables: { buildId }
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
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.log(data);
    }
  });
});

req.write(body);
req.end();
