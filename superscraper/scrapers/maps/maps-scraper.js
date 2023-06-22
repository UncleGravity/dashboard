// This script reads location data from the Overland app (https://github.com/aaronpk/Overland-iOS) and from my scraper app, and saves it to the database.

const express = require('express');
const app = express();
const db = require('../_utils/db.js');

const schema = 'maps';
const tableName = 'raw_visited_places';
const uniqueColumns = ['time', 'coordinates'];

app.use(express.json({ limit: '10mb' }));
const serverPort = process.env.SCRAPER_MAPS_PORT;

////////////////////////////////////////////////////
// Routes

// TODO create new file called server.js in teh _utils folder that runs the express server. 
// There should only be one function exposed, add a new route to the server, and then call the function from the scraper script. 
// This will make it easier to add new scrapers in the future. This might be dumb. make sure it's not dumb.

app.post('/maps', (req, res) => {
  handleMapsEndpoint(req, res);
});

app.post('/maps', (req, res) => {
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
  console.log(JSON.stringify(req.body, null, 2));
  res.json({ result: 'ok' });

  const locations = req.body.location;

  const data = [];
  locations.forEach((location) => {
    const coordinates = `POINT(${location.coords.longitude} ${location.coords.latitude})`;
    data.push([
      {
        name: 'time',
        value: location.timestamp,
        type: 'TIMESTAMP WITH TIME ZONE',
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
        type: 'INTEGER',
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
        type: 'INTEGER',
      },
    ]);
  });

  try {
    await db.saveData(schema, tableName, data, uniqueColumns);
  } catch (error) {
    console.error('Error inserting location data', error);
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
