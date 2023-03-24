const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
// const fs = require('fs');
const fs = require('fs/promises'); // Import the fs/promises module
const path = require('path');

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));
const SCHEMA = 'healthkit';

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_URL,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT
});


app.post('/healthkitapi', async (req, res) => {
  try {
    const data = req.body.data;
    await processMetrics(data.metrics);
    res.status(200).send('Nice');
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred.');
  }
});

app.get('/', async (req, res) => {
  console.log("Hello World!");
  res.send('Hello World!');
});

app.get('/importall', async (req, res) => {
  try {
    console.log("Importing all files...");
    const exportsFolderPath = './exports';
    const files = await fs.readdir(exportsFolderPath); // Use readdir method from fs/promises
    const jsonFiles = files.filter(file => path.extname(file) === '.json');

    // if (jsonFiles.length > 0) {
    //   const firstFile = jsonFiles[0];
    //   const data = await fs.readFile(path.join(exportsFolderPath, firstFile)); // Use readFile method from fs/promises
    //   const jsonData = JSON.parse(data);
    //   console.log("Processing metrics from " + firstFile);
    //   await processMetrics(jsonData.data.metrics);
    // }
    
    for (const file of jsonFiles) {
      const data = await fs.readFile(path.join(exportsFolderPath, file)); // Use readFile method from fs/promises
      const jsonData = JSON.parse(data);
      console.log("Processing metrics from " + file);
      await processMetrics(jsonData.data.metrics);
    }
    
    res.send('Import done!');
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred.');
  }
});

// Start server
const serverPort = process.env.SUPERSCRAPER_PORT || 4562;
app.listen(serverPort, () => {
  console.log('Server listening on port ' + serverPort + '...');
  createSchema();
});

async function createSchema() {
  const createSchemaQuery = `CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`;
  await pool.query(createSchemaQuery);
}

async function processMetrics(metrics) {
  // console.log(metrics);
  for (let metric of metrics) {
    let name = metric.name;
    let units = metric.units;
    let data = metric.data;

    switch (name) {
      case 'sexual_activity':
      case 'handwashing':
      case 'toothbrushing':
      case 'high_heart_rate_notifications':
        // Do nothing
        break;
      case 'blood_glucose':
        await createAndInsertData(name, data, ['date', 'qty', 'mealTime']);
        break;
      case 'blood_pressure':
        await createAndInsertData(name, data, ['date', 'systolic', 'diastolic']);
        break;
      case 'heart_rate':
        await createAndInsertData(name, data, ['date', 'min', 'avg', 'max']);
        break;
      case 'sleep_analysis':
        await createAndInsertData(name, data, ['date', 'asleep', 'sleepStart', 'sleepEnd', 'sleepSource', 'inBed', 'inBedStart', 'inBedEnd', 'inBedSource']);
        break;
      default:
        await createAndInsertData(name, data, ['date', 'qty', 'source']);
    }
  }
  console.log('Done processing metrics.');
}

async function createAndInsertData(name, data, columns) {

  if (data.length === 0) {
    console.log(`No data for ${name}, skipping table creation and insertion.`);
    return;
  }

  // Add data types for each column
  const columnDataTypes = {
    date: 'TIMESTAMP WITH TIME ZONE',
    qty: 'DOUBLE PRECISION',
    source: 'TEXT',
    systolic: 'DOUBLE PRECISION',
    diastolic: 'DOUBLE PRECISION',
    min: 'DOUBLE PRECISION',
    avg: 'DOUBLE PRECISION',
    max: 'DOUBLE PRECISION',
    mealTime: 'TEXT',
    asleep: 'DOUBLE PRECISION',
    sleepStart: 'TIMESTAMP WITH TIME ZONE',
    sleepEnd: 'TIMESTAMP WITH TIME ZONE',
    sleepSource: 'TEXT',
    inBed: 'DOUBLE PRECISION',
    inBedStart: 'TIMESTAMP WITH TIME ZONE',
    inBedEnd: 'TIMESTAMP WITH TIME ZONE',
    inBedSource: 'TEXT',
  };

  // Generate the CREATE TABLE query
  const columnDefinitions = columns.map(col => `${col} ${columnDataTypes[col]}`).join(', ');
  let createTableQuery = `CREATE TABLE IF NOT EXISTS ${SCHEMA}.${name} (${columnDefinitions})`;
  await pool.query(createTableQuery);
  console.log(createTableQuery);

  for (let row of data) {
    // Replace undefined or empty string values with null
    let values = columns.map(col => (row[col] !== undefined && row[col] !== '') ? row[col] : null);

    // Generate the INSERT query
    let placeholders = values.map((_, i) => '$' + (i + 1)).join(', '); 
    let insertQuery = `INSERT INTO ${SCHEMA}.${name} (${columns.join(', ')}) VALUES (${placeholders})`;
    // console.log(insertQuery);

    // Execute the INSERT query
    await pool.query({ text: insertQuery, values: values });
  }

  console.log(`Inserted ${data.length} rows into ${name}.`);
}