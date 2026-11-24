const https = require('https');
const state = require('C:/Users/jones/.expo/state.json');

const buildId = process.argv[2] || '0c7cab12-dc73-4947-b075-4e38281ffb5c';

const body = JSON.stringify({
  query: `query CheckBuild($buildId: ID!) {
    builds {
      byId(buildId: $buildId) {
        id
        status
        error {
          message
          errorCode
        }
        artifacts {
          buildUrl
        }
        updatedAt
        completedAt
        enqueuedAt
        provisioningStartedAt
        workerStartedAt
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

req.on('error', (err) => console.error(err));
req.write(body);
req.end();
