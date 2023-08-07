const axios = require('axios');
const qs = require('querystring');
const crypto = require('crypto');
const prompt = require('prompt-sync')({ sigint: true });
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const clientId = process.env.WITHINGS_CLIENT_ID;
const clientSecret = process.env.WITHINGS_SECRET;
const redirectUri = process.env.WITHINGS_REDIRECT_URI;
const tokensFile = process.env.WITHINGS_TOKENS_FILE;
const environment = process.env.ENVIRONMENT;

async function generateSignature(data) {
  const sortedKeys = Object.keys(data).sort();
  const sortedValues = sortedKeys.map(key => data[key]);
  const signatureInput = sortedValues.join(',');
  const hmac = crypto.createHmac('sha256', clientSecret);
  const signature = hmac.update(signatureInput).digest('hex');
  return signature;
}

// Function to get the nonce
async function getNonce() {
  try {

    const action = 'getnonce';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = await generateSignature({
      "action": action,
      "clientId": clientId,
      "timestamp": timestamp
    });

    const response = await axios.post('https://wbsapi.withings.net/v2/signature', {
      action: action,
      client_id: clientId,
      timestamp: parseInt(timestamp),
      signature: signature
    });

    console.log(response.data)

    if (response.data.status === 0) {
      return response.data.body.nonce;
    } else {
      throw new Error(response.data.error);
    }

  } catch (error) {
    console.error(error);
  }
}

async function getCodeFromUser() {
  // Prompt user in the terminal to enter the code
  const code = prompt('Enter the code: ');
  return code;
}

async function generateAuthUrl() {
  // https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=89cc06efd68b4511692f3dc92fa408416057d42fc759dc66d696f0415e43d702&scope=user.info,user.metrics&state=anyRandomString&redirect_uri=http://139.59.235.86:4562/

  const authUrl = 'https://account.withings.com/oauth2_user/authorize2';
  const params = {
    response_type: 'code',
    client_id: clientId,
    scope: 'user.info,user.metrics',
    state: 'anyRandomString',
    redirect_uri: redirectUri
  };

  if (environment == 'dev') {
    params.mode = 'demo';
  }

  const url = `${authUrl}?${qs.stringify(params)}`;

  console.log('Open this URL in your browser and get the code: \n');
  console.log(url + "\n");
}

async function getTokens(code, nonce) {
  try {

    const action = 'requesttoken';
    const signature = await generateSignature({
      "action": action,
      "clientId": clientId,
      "nonce": nonce
    });

    const tokenResponse = await axios.post('https://wbsapi.withings.net/v2/oauth2', {
      action: action,
      client_id: clientId,
      nonce: nonce,
      signature: signature,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
    });

    console.log(tokenResponse.data)

    if (tokenResponse.data.status == 0
      && tokenResponse.data.body.access_token
      && tokenResponse.data.body.refresh_token) {

      accessToken = tokenResponse.data.body.access_token;
      refreshToken = tokenResponse.data.body.refresh_token;

      let dir = path.dirname(tokensFile);

      // Check if the directory exists, if not create it
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write the tokens to the file, if the file doesn't exist, create it
      fs.writeFileSync(tokensFile, JSON.stringify({
        accessToken: accessToken,
        refreshToken: refreshToken
      }));

      return true

    } else {
      console.error(tokenResponse.data);
      return false
    }

  } catch (error) {
    console.error(error);
  }
}

async function main() {
  const nonce = await getNonce();
  generateAuthUrl();
  const code = await getCodeFromUser();
  getTokens(code, nonce);
}

main();