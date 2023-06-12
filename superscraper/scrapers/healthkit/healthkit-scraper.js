const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const db = require("../_utils/db.js");
const app = express();

app.use(express.json({ limit: '10mb' }));
const serverPort = process.env.SCRAPER_HEALTHKIT_PORT;

const SCHEMA = 'healthkit';

app.post('/test', async (req, res) => {
    handleTestEndpoint(req, res);
});

app.post('/hkapi', async (req, res) => {
    handleHkApiEndpoint(req, res);
});

app.get('/', async (req, res) => {
    handleRootEndpoint(req, res);
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
    let bundledMetrics = {};

    for (let metric of metrics) {
        let rawName = metric.quantityType || metric.categoryType || '';
        let name = (metric.quantityType || metric.categoryType || '').replace(/HK(?:Quantity|Category)TypeIdentifier/, '').toLowerCase(); // Remove HKQuantityTypeIdentifier or HKCategoryTypeIdentifier

        let units = metric.unit;
        let date = metric.startDate;
        let endDate = metric.endDate;
        let timezone = metric.metadata.HKTimeZone;
        let qty = metric.quantity;
        let source = metric.sourceRevision.source.name;

        let metricData;

        // Handle different types of data based on the quantityType or categoryType
        switch (rawName) {
            // case 'HKQuantityTypeIdentifierSexualActivity':
            // case 'HKQuantityTypeIdentifierHandwashingEvent':
            // case 'HKQuantityTypeIdentifierToothbrushingEvent':
            // case 'HKQuantityTypeIdentifierHighHeartRateEvent':
            // case 'HKQuantityTypeIdentifierBloodGlucose':
            // case 'HKQuantityTypeIdentifierBloodPressureSystolic':
            // case 'HKQuantityTypeIdentifierBloodPressureDiastolic':
            // case 'HKQuantityTypeIdentifierHeartRate':
            case 'HKCategoryTypeIdentifierSleepAnalysis':
                metricData = [
                    { name: "time",         value: date,            type: 'TIMESTAMP WITH TIME ZONE' },
                    { name:  "endDate",     value: endDate,         type: 'TIMESTAMP WITH TIME ZONE' },
                    { name: "timezone",     value: timezone,        type: 'TEXT' },
                    { name: "value",        value: metric.value,    type: 'DOUBLE PRECISION' },
                    { name: "source",       value: source,          type: 'TEXT' }
                ];
                break;
            default:
                metricData = [
                    { name: "time",         value: date,        type: 'TIMESTAMP WITH TIME ZONE' },
                    { name:  "endDate",     value: endDate,     type: 'TIMESTAMP WITH TIME ZONE' },
                    { name: "timezone",     value: timezone,    type: 'TEXT' },
                    { name: "value",        value: qty,         type: 'DOUBLE PRECISION' },
                    { name: "units",        value: units,       type: 'TEXT' },
                    { name: "source",       value: source,      type: 'TEXT' }
                ];
        }

        // Add metric data to the list of metrics of the same type
        if (!bundledMetrics[name]) {
            bundledMetrics[name] = [];
        }
        bundledMetrics[name].push(metricData);
    }

    // Create Schema
    // console.log(`Creating schema ${SCHEMA}`);
    // await createSchema(SCHEMA);

    // Save metrics one type at a time
    for (let [name, data] of Object.entries(bundledMetrics)) {

        // Create table if it doesn't exist
        // await createTable(SCHEMA, name, data[0], ['time', 'source']);
        await db.saveData(SCHEMA, name, data, ['time', 'source']);
    }

    console.log('Done processing metrics.');
}
