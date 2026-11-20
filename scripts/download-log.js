const https = require('https');
const fs = require('fs');
const state = require('C:/Users/jones/.expo/state.json');

const buildId = process.argv[2] || '5cefd454-eff3-4545-a37e-e12756524149';

const body = JSON.stringify({
  query: `query GetBuildLogs($buildId: ID!) {
    builds {
      byId(buildId: $buildId) {
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
    const parsed = JSON.parse(data);
    const logUrl = parsed.data.builds.byId.logFileUrls[0];
    console.log('Fetching log from:', logUrl.slice(0, 80) + '...');
    
    https.get(logUrl, (logRes) => {
      console.log('Status:', logRes.statusCode);
      console.log('Headers:', logRes.headers);
      let chunks = [];
      logRes.on('data', chunk => chunks.push(chunk));
      logRes.on('end', () => {
        const buf = Buffer.concat(chunks);
        const zlib = require('zlib');
        try {
          const unzipped = zlib.brotliDecompressSync(buf);
          fs.writeFileSync('super-admin/build-log-real.txt', unzipped);
          console.log('Brotli decompressed successfully! Size:', unzipped.length);
        } catch (e) {
          console.log('Decompress failed:', e.message);
          fs.writeFileSync('super-admin/build-log-real.txt', buf);
        }
      });
    });
  });
});
req.write(body);
req.end();
