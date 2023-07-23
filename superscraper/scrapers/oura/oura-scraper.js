const axios = require('axios');
const path = require('path');
const db = require("../_utils/db.js");

const SLEEPDATA_SCHEMA_NAME = "oura";

const SLEEPDATA_TABLE_NAME = "sleep_session";
const READINESS_TABLE_NAME = "readiness";
const HEART_RATE_TABLE_NAME = "heart_rate";
const HRV_TABLE_NAME = "hrv";
const SLEEP_PHASE_TABLE_NAME = "sleep_phase";
const MOVEMENT_TABLE_NAME = "movement";

const UNIQUE_COLUMNS = ['time', 'sleep_session_id'];

async function getSleepData(startDate, endDate, authToken) {
  try {
    const response = await axios.get('https://api.ouraring.com/v2/usercollection/sleep', {
      params: {
        start_date: startDate,
        end_date: endDate
      },
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    return response.data.data;
  } catch (error) {
    console.error(`Error retrieving sleep data: ${error}`);
    return [];
  }
}

async function saveData(schemaName, tableName, dataList, uniqueColumns) {
  try {
    await db.saveData(schemaName, tableName, dataList, uniqueColumns);
  } catch (error) {
    console.error(`Error saving data to ${tableName} in database: ${error}`);
  }
}

async function main() {
  const authToken = process.env.OURA_ACCESS_TOKEN;
  let startDate = new Date();
  startDate.setDate(startDate.getDate() - 300);
  startDate = startDate.toISOString().slice(0, 10);
  let endDate = new Date().toISOString().slice(0, 10);

  const sleepData = await getSleepData(startDate, endDate, authToken);

  console.log(`Retrieved ${sleepData.length} sleep sessions`);

  let sleepSessionDataList = [];
  let readinessDataList = [];
  let heartRateDataList = [];
  let hrvDataList = [];
  let sleepPhaseDataList = [];
  let movementDataList = [];

  // Process sleep data
  for (const entry of sleepData) {

    // Save sleep session data
    const sleepSessionData = [
      { name: "id", value: entry.id, type: 'TEXT NOT NULL' },
      { name: "day", value: entry.day, type: 'DATE NOT NULL' },
      { name: "time", value: entry.bedtime_start, type: 'TIMESTAMPTZ NOT NULL' }, // bedtime_start
      { name: "bedtime_end", value: entry.bedtime_end, type: 'TIMESTAMPTZ NOT NULL' },
      { name: "type", value: entry.type, type: 'TEXT' },
      { name: "time_in_bed", value: `${entry.time_in_bed} seconds`, type: 'INTERVAL' },
      { name: "total_sleep_duration", value: `${entry.total_sleep_duration} seconds`, type: 'INTERVAL' },
      { name: "latency", value: `${entry.latency} seconds`, type: 'INTERVAL' },
      { name: "deep_sleep_duration", value: `${entry.deep_sleep_duration} seconds`, type: 'INTERVAL' },
      { name: "light_sleep_duration", value: `${entry.light_sleep_duration} seconds`, type: 'INTERVAL' },
      { name: "rem_sleep_duration", value: `${entry.rem_sleep_duration} seconds`, type: 'INTERVAL' },
      { name: "awake_time", value: `${entry.awake_time} seconds`, type: 'INTERVAL' },
      { name: "efficiency", value: entry.efficiency, type: 'INTEGER' },
      { name: "restless_periods", value: entry.restless_periods, type: 'INTEGER' },
      { name: "low_battery", value: entry.low_battery_alert, type: 'BOOLEAN' },
      { name: "average_breath", value: entry.average_breath, type: 'FLOAT' },
      { name: "average_heart_rate", value: entry.average_heart_rate, type: 'FLOAT' },
      { name: "lowest_heart_rate", value: entry.lowest_heart_rate, type: 'FLOAT' },
      { name: "average_hrv", value: entry.average_hrv, type: 'FLOAT' }
    ];
    sleepSessionDataList.push(sleepSessionData);

    // Save readiness data
    const readinessData = [
      { name: "sleep_session_id", value: entry?.id, type: 'TEXT NOT NULL' },
      { name: "time", value: entry?.bedtime_end, type: 'TIMESTAMPTZ NOT NULL' },
      { name: "score", value: entry?.readiness?.score, type: 'INTEGER' },
      { name: "temperature_deviation", value: entry?.readiness?.temperature_deviation, type: 'FLOAT' },
      { name: "temperature_trend_deviation", value: entry?.readiness?.temperature_trend_deviation, type: 'FLOAT' },
      { name: "contributor_activity_balance", value: entry?.readiness?.contributors?.activity_balance, type: 'INTEGER' },
      { name: "contributor_body_temperature", value: entry?.readiness?.contributors?.body_temperature, type: 'INTEGER' },
      { name: "contributor_hrv_balance", value: entry?.readiness?.contributors?.hrv_balance, type: 'INTEGER' },
      { name: "contributor_previous_day_activity", value: entry?.readiness?.contributors?.previous_day_activity, type: 'INTEGER' },
      { name: "contributor_previous_night", value: entry?.readiness?.contributors?.previous_night, type: 'INTEGER' },
      { name: "contributor_recovery_index", value: entry?.readiness?.contributors?.recovery_index, type: 'INTEGER' },
      { name: "contributor_resting_heart_rate", value: entry?.readiness?.contributors?.resting_heart_rate, type: 'INTEGER' },
      { name: "contributor_sleep_balance", value: entry?.readiness?.contributors?.sleep_balance, type: 'INTEGER' }
    ];
    readinessDataList.push(readinessData);

    // Save heart_rate data
    let heartRateData = [];
    if (entry.heart_rate !== null) {
      for (let i = 0; i < entry.heart_rate.items.length; i++) {
        if (entry.heart_rate.items[i] !== null) {
          const initialDate = new Date(entry.heart_rate.timestamp);
          const adjustedDate = initialDate.setSeconds(entry.heart_rate.interval * i);
          const timestamp = new Date(adjustedDate).toISOString();
          heartRateData.push([
            { name: "sleep_session_id", value: entry.id, type: 'TEXT NOT NULL' },
            { name: "time", value: timestamp, type: 'TIMESTAMPTZ NOT NULL' },
            { name: "heart_rate", value: entry.heart_rate.items[i], type: 'INTEGER' }
          ]);
        }
      }
    } else {
      console.log(`No heart rate data for ${entry.id}`);
    }
    heartRateDataList = heartRateDataList.concat(heartRateData);

    // Save hrv data
    let hrvData = [];
    if (entry.hrv !== null) {
      for (let i = 0; i < entry.hrv.items.length; i++) {
        const initialDate = new Date(entry.hrv.timestamp);
        const adjustedDate = initialDate.setSeconds(entry.hrv.interval * i);
        const timestamp = new Date(adjustedDate).toISOString();
        if (entry.hrv.items[i] !== null) {
          hrvData.push([
            { name: "sleep_session_id", value: entry.id, type: 'TEXT NOT NULL' },
            { name: "time", value: timestamp, type: 'TIMESTAMPTZ NOT NULL' },
            { name: "hrv", value: entry.hrv.items[i], type: 'INTEGER' }
          ]);
        }
      }
    } else {
      console.log(`No hrv data for ${entry.id}`);
    }
    hrvDataList = hrvDataList.concat(hrvData);

    // Save sleep_phase data
    let sleepPhaseData = [];
    if (entry.sleep_phase_5_min !== null) {
      for (let i = 0; i < entry.sleep_phase_5_min.length; i++) {
        const initialDate = new Date(entry.bedtime_start);
        const adjustedDate = initialDate.setMinutes(5 * i);
        const timestamp = new Date(adjustedDate).toISOString();
        sleepPhaseData.push([
          { name: "sleep_session_id", value: entry.id, type: 'TEXT NOT NULL' },
          { name: "time", value: timestamp, type: 'TIMESTAMPTZ NOT NULL' },
          { name: "phase", value: parseInt(entry.sleep_phase_5_min.charAt(i)), type: 'INTEGER' }
        ]);
      }
    } else {
      console.log(`No sleep phase data for ${entry.id}`);
    }
    sleepPhaseDataList = sleepPhaseDataList.concat(sleepPhaseData);

    // Save movement data
    let movementData = [];
    if (entry.movement_30_sec !== null) {
      for (let i = 0; i < entry.movement_30_sec.length; i++) {
        const initialDate = new Date(entry.bedtime_start);
        const adjustedDate = initialDate.setSeconds(30 * i);
        const timestamp = new Date(adjustedDate).toISOString();
        movementData.push([
          { name: "sleep_session_id", value: entry.id, type: 'TEXT NOT NULL' },
          { name: "time", value: timestamp, type: 'TIMESTAMPTZ NOT NULL' },
          { name: "movement", value: parseInt(entry.movement_30_sec.charAt(i)), type: 'INTEGER' }
        ]);
      }
    } else {
      console.log(`No movement data for ${entry.id}`);
    }
    movementDataList = movementDataList.concat(movementData);
  }

  await saveData(SLEEPDATA_SCHEMA_NAME, SLEEPDATA_TABLE_NAME, sleepSessionDataList, ['time', 'id']);
  await saveData(SLEEPDATA_SCHEMA_NAME, READINESS_TABLE_NAME, readinessDataList, UNIQUE_COLUMNS);
  await saveData(SLEEPDATA_SCHEMA_NAME, HEART_RATE_TABLE_NAME, heartRateDataList, UNIQUE_COLUMNS);
  await saveData(SLEEPDATA_SCHEMA_NAME, HRV_TABLE_NAME, hrvDataList, UNIQUE_COLUMNS);
  await saveData(SLEEPDATA_SCHEMA_NAME, SLEEP_PHASE_TABLE_NAME, sleepPhaseDataList, UNIQUE_COLUMNS);
  await saveData(SLEEPDATA_SCHEMA_NAME, MOVEMENT_TABLE_NAME, movementDataList, UNIQUE_COLUMNS);
}

// run main function every hour
setInterval(main, 3600000);

// initial run
main().catch(error => console.error(`[${path.basename(__filename)}]: ${error}`))
