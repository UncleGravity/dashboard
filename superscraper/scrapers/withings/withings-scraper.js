const axios = require('axios');
const fs = require('fs');
const qs = require('querystring');
require('dotenv').config();
const db = require("../_utils/db.js");

const clientId = process.env.WITHINGS_CLIENT_ID;
const clientSecret = process.env.WITHINGS_SECRET;
const tokensFile = process.env.WITHINGS_TOKENS_FILE;
let accessToken, refreshToken = null;

// axios instance for Withings API
const api = axios.create({
  baseURL: 'https://wbsapi.withings.net',
});

const readTokens = () => {
  const tokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
  try {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  } catch {
    accessToken = null;
    refreshToken = null;
  }
  return { accessToken, refreshToken };
}

const getNewTokens = async () => {
  try {
    console.log("Calling getNewTokens()...");
    console.log("Using refreshToken: ", refreshToken);

    const tokenResponse = await axios.post('https://wbsapi.withings.net/v2/oauth2', qs.stringify({
      action: 'requesttoken',
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }));

    console.log(tokenResponse.data);

    if (tokenResponse.data.status === 0
      && tokenResponse.data.body.access_token
      && tokenResponse.data.body.refresh_token) {

      accessToken = tokenResponse.data.body.access_token;
      refreshToken = tokenResponse.data.body.refresh_token;

      fs.writeFileSync(tokensFile, JSON.stringify({
        accessToken: accessToken,
        refreshToken: refreshToken
      }));

      return true;

    } else {
      throw new Error(`Token refresh failed with status ${tokenResponse.data.status}`);
    }

  } catch (refreshError) {
    throw new Error(`Token refresh failed: ${refreshError.message}`);
  }
}

async function getDataFromServer(retry = true) {
  try {
    const res = await api.post('/measure', qs.stringify({
      action: 'getmeas',
      access_token: accessToken,
      meastypes: '1,6',
      category: 1,
    }));

    if (res.data.status == 401 && retry) {
      console.log("401 error called. Refreshing Token...");
      await getNewTokens();
      return getDataFromServer(false);
    }

    if (res.data.status == 401 && !retry) {
      throw new Error("401 error called again. Exiting.");
    }

    // Data received from API
    console.log(res.data);
    return res.data.body.measuregrps;

  } catch (error) {
    console.error(error);
    return [];
  }
}

const parseWeight = (measure, timestamp, deviceid) => {
  const weight = (measure.value * Math.pow(10, measure.unit));
  return [
    { name: "time", value: timestamp, type: 'TIMESTAMPTZ NOT NULL' },
    { name: "deviceid", value: deviceid, type: 'TEXT' },
    { name: "weight", value: weight, type: 'FLOAT' }
  ];
}

const parseFat = (measure, timestamp, deviceid) => {
  const fatPercentage = (measure.value * Math.pow(10, measure.unit));
  return [
    { name: "time", value: timestamp, type: 'TIMESTAMPTZ NOT NULL' },
    { name: "deviceid", value: deviceid, type: 'TEXT' },
    { name: "fat", value: fatPercentage, type: 'FLOAT' }
  ];
}

const parseValues = async (measuregrps) => {
  let fats = [];
  let weights = [];

  for (const collection of measuregrps) {
    const timestamp = new Date(collection.date * 1000).toISOString();
    const deviceid = collection.deviceid;
    const attrib = collection.attrib;
    const category = collection.category;

    if (collection.measures.length > 0 && attrib !== 1 && category === 1) {
      for (const measure of collection.measures) {
        if (measure.value === null) { continue; }

        if (measure.type === 1) {
          weights.push(parseWeight(measure, timestamp, deviceid));
        }

        if (measure.type === 6) {
          fats.push(parseFat(measure, timestamp, deviceid));
        }
      }
    }
  }

  return { weights, fats };
}

const saveToDB = async () => {
  try {
    const measuregrps = await getDataFromServer();
    const { weights, fats } = await parseValues(measuregrps);

    WITHINGS_SCHEMA_NAME = 'withings';
    WEIGHT_TABLE_NAME = 'weight';
    FAT_TABLE_NAME = 'fat';

    await db.saveData(WITHINGS_SCHEMA_NAME, WEIGHT_TABLE_NAME, weights, ['time', 'deviceid'])
      .catch(error => {
        console.error(`Error saving ${WEIGHT_TABLE_NAME} data to database: ${error}`);
      });

    await db.saveData(WITHINGS_SCHEMA_NAME, FAT_TABLE_NAME, fats, ['time', 'deviceid'])
      .catch(error => {
        console.error(`Error saving ${FAT_TABLE_NAME} data to database: ${error}`);
      });

  } catch (error) {
    console.error(error);
  }
}

const main = async () => {

  readTokens();
  if (!accessToken || !refreshToken) {
    throw new Error("No tokens found. Exiting.");
  }

  try {
    await saveToDB();
  } catch (error) {
    throw new Error(`${error}`);
  }

}


// run main function every hour
setInterval(main, 3600000);

// initial run
main().catch(error => console.error(`Error on main() function: ${error}`));