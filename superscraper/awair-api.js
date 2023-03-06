const axios = require("axios");
const fs = require("fs");

// API Docs: https://docs.developer.getawair.com/?version=latest
// Save this somewhere safer, like an .env file
const ACCESS_TOKEN = process.env.AWAIR_ACCESS_TOKEN;
const DEVICE_IDS = [19796, 117]; // Replace with your device IDs
const REFRESH_INTERVAL = 60000; // 1 minute
const DATA_INTERVAL = 300000; // 5 minutes
const DATA_BUFFER = 10; // Number of extra data points to retrieve
const OUTPUT_FILE = "air_data.txt";

// Get latest air data for a device
/* Returns array in this format:
[
  {
    timestamp: '2023-02-14T09:09:30.000Z',
    score: 92,
    sensors: [ {"comp":"pm25","value":3}, {"comp":"co2","value":467}, {"comp":"temp","value":71.69}, {"comp":"humid","value":56.76} ,{"comp":"voc","value":337} ],
    indices: [ [Object], [Object], [Object], [Object], [Object] ]
  },
  {
  ...
  },
  ...
]
*/
async function getAirData(deviceId) {
  const config = {
    method: "get",
    url: `https://developer-apis.awair.is/v1/users/self/devices/awair-element/${deviceId}/air-data/raw`,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    params: {
      fahrenheit: true,
      limit: 360,
    },
  };

  try {
    const response = await axios(config);
    // console.log(JSON.stringify(response.data));
    return response.data.data.length > 0 ? extractAirData(response.data.data) : [];
  } catch (error) {
    throw error;
  }
}

// Get all devices
/* Response looks like this:
{
  devices: [
    {
      name: 'Bedroom',
      deviceId: 19796,
      deviceType: 'awair-element',
      deviceUUID: 'awair-element_19796',
      latitude: 0,
      longitude: 0,
      preference: 'SLEEP',
      locationName: '',
      roomType: 'BEDROOM',
      spaceType: 'HOME',
      macAddress: '70886B14388A',
      timezone: ''
    },
    {
      name: 'Living Room',
      deviceId: 117,
      deviceType: 'awair-element',
      deviceUUID: 'awair-element_117',
      latitude: 0,
      longitude: 0,
      preference: 'GENERAL',
      locationName: '',
      roomType: 'LIVING_ROOM',
      spaceType: 'HOME',
      macAddress: '70886B1407B7',
      timezone: ''
    }
  ]
}
*/
async function getDevices() {
  var config = {
    method: "get",
    url: "https://developer-apis.awair.is/v1/users/self/devices",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
  };

  try {
    const response = await axios(config);
    // console.log(response.data);
    return response.data.devices.length > 0 ? response.data : [];
  } catch (error) {
    throw error;
  }
}

async function getDeviceIdList() {
  const devices = await getDevices();

  const deviceIds = [];
  for (let i = 0; i < devices.devices.length; i++) {
    deviceIds.push(devices.devices[i].deviceId);
  }

  return deviceIds;
  // console.log(deviceIds); // Output: [19796, 117]
}

// Extract data from air data response
/* Response looks like this:
[
  '2023-02-14T09:14:11.000Z,71.87,56.78,459,337,2',
  '2023-02-14T09:14:01.000Z,71.798,56.78,459,335,2',
  '2023-02-14T09:13:51.000Z,71.762,56.76,459,331,2',
  ...
]
*/
function extractAirData(response) {
  const data = response;
  const result = [];

  for (let i = 0; i < data.length; i++) {
    const timestamp = data[i].timestamp;
    const sensors = data[i].sensors;
    const values = sensors.reduce((acc, curr) => {
      acc[curr.comp] = curr.value;
      return acc;
    }, {});

    const row = `${timestamp},${values.temp},${values.humid},${values.co2},${values.voc},${values.pm25}`;
    result.push(row);
  }

  return result;
}

function saveDataToFile(airData, fileName) {
  const fileContents = airData.join("\n").concat("\n");
  fs.appendFileSync(fileName, fileContents);
  console.log(`Data saved to file: ${fileName}`);
}

// run();
// console.log(getLastTimestamp("177"))
async function test() {
  console.log(await getDevices())
  console.log(await getAirData("117"))
  // let response = await getAirData("117")
  // console.log(response)
  // data = extractAirData(response)
  // console.log(data)
  // saveDataToFile(data, "test.txt")
}

// test()

module.exports = { getDevices, getAirData, getDeviceIdList };
