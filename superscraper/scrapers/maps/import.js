const fs = require('fs');
const path = require('path');
const db = require('../_utils/db.js');

// Load the GeoJSON file
const geoJSONFile = path.resolve(__dirname, './history/visited-places-detailed.geojson');
const geoJSONData = JSON.parse(fs.readFileSync(geoJSONFile, 'utf-8'));

// Schema, table and unique column names
const schema = 'maps';
const tableName = 'google_maps_visited_places';
const uniqueColumns = ['time','location'];

// Extract the data from the GeoJSON features and format to match the data format for saveData function
const data = geoJSONData.features.map((feature) => {
    const coordinates = `POINT(${feature.properties.lon} ${feature.properties.lat})`;
    return [
      {
        name: 'time',
        value: feature.properties.from_date,
        type: 'TIMESTAMP WITH TIME ZONE',
      },
      {
        name: 'to_date',
        value: feature.properties.to_date,
        type: 'TIMESTAMP WITH TIME ZONE',
      },
      {
        name: 'location',
        value: feature.properties.location,
        type: 'TEXT',
      },
      {
        name: 'coordinates',
        value: coordinates,
        type: 'GEOGRAPHY(POINT, 4326)',
      },
    ];
  });
  
  // Save the data to the database
  (async () => {
    try {
      await db.saveData(schema, tableName, data, uniqueColumns);
      console.log('Data has been successfully saved to the database.');
    } catch (error) {
      console.error('An error occurred while saving data to the database:', error);
    }
  })();