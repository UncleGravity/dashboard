const { getAirData, getDevices, getDeviceIdList } = require("./awair-api.js");
const db = require("../_utils/db.js");

const AIRDATA_TABLE_NAME = "awair_sensor_data";
const AIRDATA_SCHEMA_NAME = "awair";

async function main() {

  // save data for all devices
  for (const deviceId of await getDeviceIdList()) {
    const airData = await getAirData(deviceId);
    const formattedData = airData.map(entry => {
      const [time, temp, humid, co2, voc, pm25] = entry.split(",");
      return [
        { name: "time",     value: time,     type: 'TIMESTAMPTZ' },
        { name: "deviceid", value: deviceId, type: 'INTEGER' },
        { name: "temp",     value: temp,     type: 'FLOAT' },
        { name: "humid",    value: humid,    type: 'FLOAT' },
        { name: "co2",      value: co2,      type: 'INTEGER' },
        { name: "voc",      value: voc,      type: 'INTEGER' },
        { name: "pm25",     value: pm25,     type: 'INTEGER' }
      ];
    });
    // await db.saveData(AIRDATA_SCHEMA_NAME, AIRDATA_TABLE_NAME, formattedData, ['time', 'deviceid']);
  }

  // read 100 rows from table (for testing)
  // for (const deviceId of await getDeviceIdList()) {
    // const rows = await db.readData(AIRDATA_SCHEMA_NAME, AIRDATA_TABLE_NAME, 100);
    // console.log(rows);
  // }
}


// run main function every 5 minutes
setInterval(main, 240000);
main();

/*

// Example array of data
const data = [
  "2023-02-14T12:18:48.000Z,72.69800000000001,55.44,538,903,10",
  "2023-02-14T12:18:38.000Z,72.5,55.51,500,846,4",
  "2023-02-14T12:18:28.000Z,72.32,56.14,493,742,3",
  "2023-02-14T12:18:18.000Z,72.176,54.98,493,706,3",
  "2023-02-14T12:18:08.000Z,72.158,55.26,494,687,4",
  "2023-02-14T12:17:58.000Z,72.158,55.3,495,742,3",
  "2023-02-14T12:17:48.000Z,72.19399999999999,55.11,494,788,3",
];

NOTES:
CREATE TABLE awair_id_117 (   
    timestamp TIMESTAMPTZ NOT NULL,   
    temp FLOAT NOT NULL,   
    humid FLOAT NOT NULL,   
    co2 INTEGER NOT NULL,   
    voc INTEGER NOT NULL,   
    pm25 INTEGER NOT NULL 
);

SELECT create_hypertable('awair_id_117', 'timestamp');

ALTER TABLE awair_id_117 ADD CONSTRAINT unique_timestamp UNIQUE (timestamp);

INSERT INTO awair_id_117 (timestamp, temp, humid, co2, voc, pm25) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (timestamp) DO NOTHING;
*/