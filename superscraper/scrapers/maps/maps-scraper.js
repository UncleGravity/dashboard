const express = require('express');
const app = express();
const db = require('../_utils/db.js');
const geoTz = require('geo-tz');

const schema = 'maps';
const tableName = 'raw_visited_places';
const uniqueColumns = ['time', 'coordinates'];

app.use(express.json({ limit: '50mb' }));
const serverPort = process.env.SCRAPER_MAPS_PORT;

////////////////////////////////////////////////////
// Routes

// TODO create new file called server.js in teh _utils folder that runs the express server. 
// There should only be one function exposed, add a new route to the server, and then call the function from the scraper script. 
// This will make it easier to add new scrapers in the future. This might be dumb. make sure it's not dumb.

app.post('/maps', (req, res) => {
  handleMapsEndpoint(req, res);
});

app.post('/maps_overland', (req, res) => {
  handleOverlandEndpoint(req, res);
});

app.get('/', async (req, res) => {
  handleRootEndpoint(req, res);
});

// Start server
app.listen(serverPort, () => {
  console.log(`Maps Scraper server listening on port ${serverPort}`);
});

////////////////////////////////////////////////////
// Endpoint handlers

async function handleRootEndpoint(req, res) {
  res.status(200).send('Hello from the Maps scraper!');
}

async function handleMapsEndpoint(req, res) {
  // console.log(JSON.stringify(req.body, null, 2));
  const locations = req.body.location;

  /*
       column_name     |        data_type         
---------------------+--------------------------
 time                | timestamp with time zone
 coordinates         | USER-DEFINED
 altitude            | double precision
 horizontal_accuracy | integer
 altitude_accuracy   | double precision
 speed               | double precision
 is_moving           | boolean
 activity_type       | text
 activity_confidence | integer
 */

  const data = [];
  locations.forEach((location) => {
    const coordinates = `POINT(${location.coords.longitude} ${location.coords.latitude})`;
    let tz = geoTz.find(location.coords.latitude, location.coords.longitude)[0] || ''; // Get local timezone with geo-tz

    data.push([
      {
        name: 'time',
        value: location.timestamp,
        type: 'TIMESTAMP WITH TIME ZONE',
      },
      {
        name: 'timezone',
        value: tz,
        type: 'TEXT',
      },
      {
        name: 'coordinates',
        value: coordinates,
        type: 'GEOGRAPHY(POINT, 4326)',
      },
      {
        name: 'altitude',
        value: location.coords.altitude,
        type: 'DOUBLE PRECISION',
      },
      {
        name: 'horizontal_accuracy',
        value: location.coords.accuracy,
        type: 'DOUBLE PRECISION',
      },
      {
        name: 'altitude_accuracy',
        value: location.coords.altitude_accuracy,
        type: 'DOUBLE PRECISION',
      },
      {
        name: 'speed',
        value: location.coords.speed,
        type: 'DOUBLE PRECISION',
      },
      {
        name: 'is_moving',
        value: location.is_moving,
        type: 'BOOLEAN',
      },
      {
        name: 'activity_type',
        value: location.activity.type,
        type: 'TEXT',
      },
      {
        name: 'activity_confidence',
        value: location.activity.confidence,
        type: 'REAL',
      },
    ]);
  });

  try {
    await db.saveData(schema, tableName, data, uniqueColumns);
    res.json({ result: 'ok' });
  } catch (error) {
    console.error('Error inserting location data', error);
    res.status(500).json({ error: error.message });
    //TODO: repeat this on other scrapers
  }
}

async function handleOverlandEndpoint(req, res) {
  console.log(JSON.stringify(req.body, null, 2));
  res.json({ result: 'ok' });

  console.log(req.body.location.coords)

  // parse location json data
  const locations = req.body.locations;

  const data = [];
  locations.forEach((location) => {
    const coordinates = `POINT(${location.geometry.coordinates[0]} ${location.geometry.coordinates[1]})`;
    data.push([
      {
        name: 'time',
        value: location.properties.timestamp,
        type: 'TIMESTAMP WITH TIME ZONE',
      },
      {
        name: 'coordinates',
        value: coordinates,
        type: 'GEOGRAPHY(POINT, 4326)',
      },
      {
        name: 'altitude',
        value: location.properties.altitude,
        type: 'DOUBLE PRECISION',
      },
      {
        name: 'speed',
        value: location.properties.speed,
        type: 'DOUBLE PRECISION',
      },
      {
        name: 'horizontal_accuracy',
        value: location.properties.horizontal_accuracy,
        type: 'DOUBLE PRECISION',
      },
      {
        name: 'vertical_accuracy',
        value: location.properties.vertical_accuracy,
        type: 'DOUBLE PRECISION',
      },
      {
        name: 'motion',
        value: location.properties.motion.join(','),
        type: 'TEXT',
      },
      {
        name: 'pauses',
        value: location.properties.pauses,
        type: 'BOOLEAN',
      },
      {
        name: 'activity',
        value: location.properties.activity,
        type: 'TEXT',
      },
      {
        name: 'desired_accuracy',
        value: location.properties.desired_accuracy,
        type: 'DOUBLE PRECISION',
      },
      {
        name: 'deferred',
        value: location.properties.deferred,
        type: 'DOUBLE PRECISION',
      },
      {
        name: 'significant_change',
        value: location.properties.significant_change,
        type: 'TEXT',
      },
      {
        name: 'locations_in_payload',
        value: location.properties.locations_in_payload,
        type: 'INTEGER',
      },
      {
        name: 'battery_state',
        value: location.properties.battery_state,
        type: 'TEXT',
      },
      {
        name: 'battery_level',
        value: location.properties.battery_level,
        type: 'DOUBLE PRECISION',
      },
      {
        name: 'device_id',
        value: location.properties.device_id,
        type: 'TEXT',
      },
      {
        name: 'wifi',
        value: location.properties.wifi,
        type: 'TEXT',
      },
    ]);
  });

  try {
    // save data to timescaledb
    await db.saveData(schema, tableName, data, uniqueColumns);
  } catch (error) {
    console.error('Error inserting location data', error);
  }
}
