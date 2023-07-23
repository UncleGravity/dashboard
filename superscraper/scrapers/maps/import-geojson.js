// This file takes a GeoJSON file and imports it into the database
// The GeoJSON file contains all the visited places from Google Maps
// Drop the zip file inside the ./history/in/ directory and run this file

const fs = require('fs');
const path = require('path');
const db = require('../_utils/db.js');
const { exit } = require('process');
const { exec } = require('child_process');
const util = require('util');
const execPromisified = util.promisify(exec);

const outDir = path.resolve(__dirname, `./history/out/`);
const inDir = path.resolve(__dirname, `./history/in/`);
const extractedDir = path.resolve(__dirname, `./history/extracted/`);
const geoJSONFile = path.resolve(__dirname, './history/out/out.json');
// const geoJSONFile = path.resolve(__dirname, './history/visited-places-detailed.geojson');

// Schema, table and unique column names
const schema = 'maps';
const pointTableName = 'google_maps_visited_points';
const lineTableName = 'google_maps_visited_lines';
const uniqueColumns = ['time', 'location'];


const eraseDir = (dir) => {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true })  // Erase outDir
    } catch (err) {
      throw Error('Error erasing outDir: ' + err.message);
    }
  }
};

const unzipFile = async (zipFilePath, outDir) => {
  return new Promise((resolve, reject) => {

    try {
      exec(`unzip -o ${zipFilePath} -d ${outDir}`, (err, stdout, stderr) => {
        if (err) {
          console.error('An error occurred while decompressing the file:', err);
          reject(err);
        } else {
          console.log('Files decompressed successfully');
          resolve();
        }
      });

    } catch (err) { throw err; }

  });
};

const parseGeoJSON = (geoJSONData) => {

  const lineData = geoJSONData.features.map((feature) => {
    if (feature.geometry.type !== 'LineString') { return null; }
    if (feature.geometry.coordinates.length < 2) { return null; }

    const coordinates = feature.geometry.coordinates
      .filter(coordinate => !(coordinate[0] === null || coordinate[1] === null))
      .map((coordinate) => {
        return `${coordinate[0]} ${coordinate[1]}`; // remove POINT keyword
      }).join(', ');

    const startTime = new Date(feature.properties.timestamp);
    const durationInMS = feature.properties.durationInMS;
    const endTime = new Date(startTime.getTime() + durationInMS);
    if (coordinates !== "") { // if all coordinates are null, it will return an empty string
      return [
        {
          name: 'time',
          value: startTime.toISOString(),
          type: 'TIMESTAMP WITH TIME ZONE',
        },
        {
          name: 'end_time',
          value: endTime.toISOString(),
          type: 'TIMESTAMP WITH TIME ZONE',
        },
        {
          name: 'location',
          value: feature.properties.name,
          type: 'TEXT',
        },
        {
          name: 'coordinates',
          value: `LINESTRING(${coordinates})`,
          type: 'GEOGRAPHY(LINESTRING, 4326)',
        },
      ];
    } else {
      return null;
    }
  });

  // Extract the data from the GeoJSON features and format to match the data format for saveData function
  const pointData = geoJSONData.features.map((feature) => {
    if (feature.geometry.type !== 'Point') { return null; }

    const longitude = feature.geometry.coordinates[0];
    const latitude = feature.geometry.coordinates[1];
    if (!longitude || !latitude) { return null; }

    const coordinates = `POINT( ${feature.geometry.coordinates[0]} ${feature.geometry.coordinates[1]} )`;
    const startTime = new Date(feature.properties.timestamp);
    const durationInMS = feature.properties.durationInMS;
    const endTime = new Date(startTime.getTime() + durationInMS);
    return [
      {
        name: 'time',
        value: startTime.toISOString(),
        type: 'TIMESTAMP WITH TIME ZONE',
      },
      {
        name: 'end_time',
        value: endTime.toISOString(),
        type: 'TIMESTAMP WITH TIME ZONE',
      },
      {
        name: 'location',
        value: feature.properties.name,
        type: 'TEXT',
      },
      {
        name: 'coordinates',
        value: coordinates,
        type: 'GEOGRAPHY(POINT, 4326)',
      },
    ];
  });

  return { pointData, lineData };
};

// Save the data to the database
async function main() {

  // Initialize directories
  eraseDir(outDir);
  eraseDir(extractedDir);
  if (!fs.existsSync(outDir)) { fs.mkdirSync(outDir); }
  if (!fs.existsSync(inDir)) { throw Error('inDir does not exist'); }
  console.log('Directories initialized successfully');

  // Get the first zip file in the directory
  const zipFile = fs.readdirSync(inDir).find((file) => file.endsWith('.zip'));
  if (!zipFile) { throw new Error('No zip file found in inDir'); }
  const zipFilePath = path.join(inDir, zipFile);
  console.log('Found zip file:', zipFilePath);

  // Unzip the file
  await unzipFile(zipFilePath, extractedDir);
  console.log('Unzipped file successfully');

  // Convert Google Takeout data to GeoJSON
  const { stdout, stderr } = await execPromisified(`\
    node ${path.resolve(__dirname, "GoogleTakeoutLocationHistoryParser/index.mjs")} \
    --include-all-waypoints \
    --include-timestamps \
    --metadata activityType durationInMS \
    --output-name ${outDir}/out \
    ${extractedDir}/Takeout/ \
  `);

  // load the GeoJSON file
  const geoJSONData = JSON.parse(fs.readFileSync(geoJSONFile, 'utf-8'));

  // parse the GeoJSON data to database-ready format
  const { pointData, lineData } = parseGeoJSON(geoJSONData);

  // remove null entries
  const pointDataFiltered = pointData.filter((entry) => entry !== null);
  const lineDataFiltered = lineData.filter(entry => entry != null);

  try {
    // save to db
    await db.saveData(schema, pointTableName, pointDataFiltered, uniqueColumns);
    await db.saveData(schema, lineTableName, lineDataFiltered, uniqueColumns);
    console.log('Data has been successfully saved to the database.');
  } catch (error) {
    console.error('An error occurred while saving data to the database:', error);
  }
}

main().catch(error => console.error(`[${path.basename(__filename)}]: ${error}`))