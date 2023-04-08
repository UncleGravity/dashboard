const express = require('express');
const app = express();
const db = require('../_utils/db.js');

const schema = 'app_usage';
// const tableName = 'raw_screen_time_data';
// const uniqueColumns = ['time', 'appname', 'deviceid'];

app.use(express.json({ limit: '10mb' }));
const serverPort = process.env.SCRAPER_SCREENTIME_PORT;

app.post('/test', (req, res) => {
    console.log(JSON.stringify(req.body, null, 2));
    res.json({ result: 'ok' });
});

app.post('/screentime', (req, res) => {
      handleScreenTimeEndpoint(req, res);
});

app.get('/', async (req, res) => {
    handleRootEndpoint(req, res);
});

// Start server
app.listen(serverPort, () => {
    console.log(`Server is running on port ${serverPort}`);
});

// Endpoints handling functions
async function handleRootEndpoint(req, res) {
    res.status(200).send('Hello from the Screen Time app usage server!');
}

async function handleScreenTimeEndpoint(req, res) {
    console.log(JSON.stringify(req.body, null, 2));

    /* Expected request body:
    combined_data = {
        'screenTimeData': screentime_data,
        'windowEventData': window_data,
        'webEventData': web_data,
        'vscodeEventData': vscode_data,
        'utc_offset': get_utc_offset() / 3600
    }
    */

    await saveScreenTimeData(req.body.screenTimeData);
    await saveScreenTimeWebData(req.body.screenTimeWebData);
    await saveWindowEventData(req.body.windowEventData);
    await saveWebEventData(req.body.webEventData);
    await saveVscodeEventData(req.body.vscodeEventData);

    res.json({ result: 'ok' });
}

async function saveScreenTimeData(screenTimeData) {
    const tableName = 'apple_screen_time_data';
    const uniqueColumns = ['time', 'app_name', 'device_id'];

    const data = [];
    screenTimeData.forEach((entry) => {
        data.push([
            {
                name: 'time',
                value: entry.time_start,
                type: 'TIMESTAMP WITH TIME ZONE',
            },
            {
                name: 'time_end',
                value: entry.time_end,
                type: 'TIMESTAMP WITH TIME ZONE',
            },
            {
                name: 'app_name',
                value: entry.app_name,
                type: 'TEXT',
            },
            {
                name: 'device_id',
                value: entry.device_id,
                type: 'TEXT',
            },
            {
                name: 'device_name',
                value: entry.device_name,
                type: 'TEXT',
            },
            {
                name: 'gmt_offset',
                value: entry.gmt_offset,
                type: 'INTEGER',
            },
        ]);
    });

    try {
        // Save data to the database
        await db.saveData(schema, tableName, data, uniqueColumns);
    } catch (error) {
        console.error('Error inserting screen time data', error);
    }
}

async function saveScreenTimeWebData(screenTimeWebData) {
    const tableName = 'apple_screen_time_web_data';
    const uniqueColumns = ['time', 'device_id'];

    const data = [];
    screenTimeWebData.forEach((entry) => {
        data.push([
            {
                name: 'time',
                value: entry.time_start,
                type: 'TIMESTAMP WITH TIME ZONE',
            },
            {
                name: 'time_end',
                value: entry.time_end,
                type: 'TIMESTAMP WITH TIME ZONE',
            },
            {
                name: 'app_name',
                value: entry.app_name,
                type: 'TEXT',
            },
            {
                name: 'device_id',
                value: entry.device_id,
                type: 'TEXT',
            },
            {
                name: 'device_name',
                value: entry.device_name,
                type: 'TEXT',
            },
            {
                name: 'gmt_offset',
                value: entry.gmt_offset,
                type: 'INTEGER',
            },
        ]);
    });

    try {
        // Save data to the database
        await db.saveData(schema, tableName, data, uniqueColumns);
    } catch (error) {
        console.error('Error inserting screen time data', error);
    }
}

async function saveWindowEventData(windowEventData) {
    const tableName = 'aw_window_event_data';
    const uniqueColumns = ['time', 'app_name'];

    const data = [];
    windowEventData.forEach((entry) => {
        data.push([
            {
                name: 'time',
                value: entry.time_start,
                type: 'TIMESTAMP WITH TIME ZONE',
            },
            {
                name: 'time_end',
                value: entry.time_end,
                type: 'TIMESTAMP WITH TIME ZONE',
            },
            {
                name: 'duration',
                value: entry.duration,
                type: 'DOUBLE PRECISION',
            },
            {
                name: 'app_name',
                value: entry.app_name,
                type: 'TEXT',
            },
        ]);
    });

    try {
        // Save data to the database
        await db.saveData(schema, tableName, data, uniqueColumns);
    } catch (error) {
        console.error('Error inserting window event data', error);
    }
}

async function saveWebEventData(webEventData) {
    const tableName = 'aw_web_event_data';
    const uniqueColumns = ['time', 'url'];

    const data = [];
    webEventData.forEach((entry) => {
        data.push([
            {
                name: 'time',
                value: entry.time_start,
                type: 'TIMESTAMP WITH TIME ZONE',
            },
            {
                name: 'time_end',
                value: entry.time_end,
                type: 'TIMESTAMP WITH TIME ZONE',
            },
            {
                name: 'duration',
                value: entry.duration,
                type: 'DOUBLE PRECISION',
            },
            {
                name: 'url',
                value: entry.url,
                type: 'TEXT',
            },
            {
                name: 'audible',
                value: entry.audible,
                type: 'BOOLEAN',
            },
        ]);
    });

    try {
        // Save data to the database
        await db.saveData(schema, tableName, data, uniqueColumns);
    } catch (error) {
        console.error('Error inserting web event data', error);
    }
}

async function saveVscodeEventData(vscodeEventData) {
    const tableName = 'aw_vscode_event_data';
    const uniqueColumns = ['time', 'file'];

    const data = [];
    vscodeEventData.forEach((entry) => {
        data.push([
            {
                name: 'time',
                value: entry.time_start,
                type: 'TIMESTAMP WITH TIME ZONE',
            },
            {
                name: 'time_end',
                value: entry.time_end,
                type: 'TIMESTAMP WITH TIME ZONE',
            },
            {
                name: 'duration',
                value: entry.duration,
                type: 'DOUBLE PRECISION',
            },
            {
                name: 'language',
                value: entry.language,
                type: 'TEXT',
            },
            {
                name: 'project',
                value: entry.project,
                type: 'TEXT',
            },
            {
                name: 'file',
                value: entry.file,
                type: 'TEXT',
            },
        ]);
    });

    try {
        // Save data to the database
        await db.saveData(schema, tableName, data, uniqueColumns);
    } catch (error) {
        console.error('Error inserting vscode event data', error);
    }
}