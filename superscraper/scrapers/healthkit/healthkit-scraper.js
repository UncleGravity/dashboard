const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { saveData } = require('../_utils/db.js');

const app = express();
app.use(express.json({ limit: '10mb' }));
const serverPort = process.env.SUPERSCRAPER_PORT || 4562;

const SCHEMA = 'healthkit';

app.post('/test', async (req, res) => {
    handleTestEndpoint(req, res);
});

app.post('/healthkitapi', async (req, res) => {
    handleHealthkitApiEndpoint(req, res);
});

app.post('/hkapi', async (req, res) => {
    handleHkApiEndpoint(req, res);
});

app.get('/', async (req, res) => {
    handleRootEndpoint(req, res);
});

app.get('/importall', async (req, res) => {
    handleImportAllEndpoint(req, res);
});

// Start server
app.listen(serverPort, () => {
    console.log('Server listening on port ' + serverPort + '...');
});

//--- Endpoints handling functions

async function handleTestEndpoint(req, res) {
    // Print quantityType for all entries in the request body
    const data = req.body;
    for (let metric of data) {
        if (metric.categoryType != undefined) {
            console.log(metric);
            // print "+" without new line
            // process.stdout.write('+');
        }
        else {
            // process.stdout.write('-');
        }
        // console.log(metric);
    }
    res.status(200).send('nice');
}

async function handleHkApiEndpoint(req, res) {
    try {
        const data = req.body;
        await processMetrics(data);
        res.status(200).send('Nice');
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred.');
    }
 }
async function handleRootEndpoint(req, res) {
    res.status(200).send('Hello from the HealthKit scraper!');
}

//--- Other necessary functions
async function processMetrics(metrics) {
    for (let metric of metrics) {
        let rawName = metric.quantityType || metric.categoryType || '';
        let name = (metric.quantityType || metric.categoryType || '').replace(/HK(?:Quantity|Category)TypeIdentifier/, '').toLowerCase(); // Remove HKQuantityTypeIdentifier or HKCategoryTypeIdentifier
        let units = metric.unit;
        let date = metric.startDate;
        let endDate = metric.endDate;
        let timezone = metric.metadata.HKTimeZone;
        let qty = metric.quantity;
        let source = metric.sourceRevision.source.name;

        // Create a new object with the relevant data
        // Index is the column name
        let healthKitData =
            {
                time:       { value: date,      type: 'TIMESTAMP WITH TIME ZONE' },
                endDate:    { value: endDate,   type: 'TIMESTAMP WITH TIME ZONE' },
                /* timezone:   { value: timezone,  type: 'TEXT' }, */
                value:     { value: qty,       type: 'DOUBLE PRECISION' },
                units:      { value: units,     type: 'TEXT' },
                source:     { value: source,    type: 'TEXT' }
            };

        // Handle different types of data based on the quantityType or categoryType
        switch (rawName) {
            // case 'HKQuantityTypeIdentifierSexualActivity':
            // case 'HKQuantityTypeIdentifierHandwashingEvent':
            // case 'HKQuantityTypeIdentifierToothbrushingEvent':
            // case 'HKQuantityTypeIdentifierHighHeartRateEvent':
            //     // Do nothing
            // case 'HKQuantityTypeIdentifierBloodGlucose':
            // case 'HKQuantityTypeIdentifierBloodPressureSystolic':
            // case 'HKQuantityTypeIdentifierBloodPressureDiastolic':
            // case 'HKQuantityTypeIdentifierHeartRate':
            case 'HKCategoryTypeIdentifierSleepAnalysis':

                let sleepData =
                {
                    time:       { value: date,      type: 'TIMESTAMP WITH TIME ZONE' },
                    endDate:    { value: endDate,   type: 'TIMESTAMP WITH TIME ZONE' },
                    /* timezone:   { value: timezone,  type: 'TEXT' }, */
                    value:     { value: metric.value,       type: 'DOUBLE PRECISION' },
                    /* units:      { value: units,     type: 'TEXT' }, */
                    source:     { value: source,    type: 'TEXT' }
                };
                await saveData(SCHEMA, name, sleepData);
                break;
            default:
                await saveData(SCHEMA, name, healthKitData);
        }
    }
    console.log('Done processing metrics.');
}
async function processMetricsHKAE(metrics) {
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
                await saveData(name, data, ['date', 'qty', 'mealTime']);
                break;
            case 'blood_pressure':
                await saveData(name, data, ['date', 'systolic', 'diastolic']);
                break;
            case 'heart_rate':
                await saveData(name, data, ['date', 'min', 'avg', 'max']);
                break;
            case 'sleep_analysis':
                await saveData(name, data, ['date', 'asleep', 'sleepStart', 'sleepEnd', 'sleepSource', 'inBed', 'inBedStart', 'inBedEnd', 'inBedSource']);
                break;
            default:
                await saveData(name, data, ['date', 'qty', 'source']);
        }
    }
    console.log('Done processing metrics.');
}

// async function createSchema(schema) {
//     const createSchemaQuery = `CREATE SCHEMA IF NOT EXISTS ${schema}`;
//     await pool.query(createSchemaQuery);
// }

// async function doesTableExist(schema, tableName) {
//     // Check if the table exists
//     const checkTableExistsQuery = `
//         SELECT EXISTS(
//             SELECT * FROM 
//             _timescaledb_catalog.hypertable 
//             WHERE 
//             table_name = '${tableName}'
//             AND
//             schema_name = '${schema}'
//         );
//       `;

//     const { rows } = await pool.query(checkTableExistsQuery);
//     const tableExists = rows[0].exists;
//     return tableExists;
// }

// async function createTable(schema, tableName, columns) {

//     // Generate the CREATE TABLE query
//     const columnDefinitions = columns.map(col => `${col.name} ${col.type}`).join(', ');

//     let createTableQuery = `CREATE TABLE IF NOT EXISTS ${schema}.${tableName} (
//                             ${columnDefinitions}, 
//                             UNIQUE (time, source) 
//                             );`;

//     // Create Table
//     await pool.query(createTableQuery);
//     console.log(createTableQuery);

//     // Convert table to hypertable
//     await pool.query(`SELECT create_hypertable('${SCHEMA}.${tableName}', 'time');`);
// }


// async function saveData(schema, name, data) {
//     // if (Object.keys(data).length === 0) {
//     //     console.log(`No data for ${name}, skipping table creation and insertion.`);
//     //     return;
//     // }

//     console.log(`Creating schema ${schema}`);
//     createSchema(schema);

//     // Check if the table exists
//     console.log(`Checking if table ${schema}.${name} exists`);
//     const tableExists = await doesTableExist(schema, name);
//     if (!tableExists) {
//         const columns = Object.entries(data).map(([key, value]) => ({ name: key, type: value.type }));
//         console.log(`Table ${schema}.${name} does not exist, creating it.`);
//         await createTable(schema, name, columns);
//     }

//     // Insert data
//     const rowData = Object.entries(data).map(([key, value]) => value.value);
//     console.log(rowData);

//     // Replace undefined or empty string values with null
//     const values = rowData.map(value => (value !== undefined && value !== '') ? value : null);
//     console.log(values);

//     // Generate the INSERT query
//     const columnNames = Object.keys(data); // eg: ['time', 'duration', 'qty', 'units', 'source']
//     console.log(columnNames)
//     const placeholders = columnNames.map((_, i) => '$' + (i + 1)).join(', '); // eg: $1, $2, $3, etc.
//     console.log(placeholders)
//     const insertQuery = `INSERT INTO ${schema}.${name} (${columnNames.join(', ')}) 
//                          VALUES (${placeholders})
//                          ON CONFLICT (time, source) DO NOTHING;
//                          `;
//     console.log(insertQuery);

//     // Execute the INSERT query
//     await pool.query({ text: insertQuery, values: values });

//     console.log(`Inserted 1 row into ${name}.`);
// }

