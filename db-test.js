const { Client } = require("pg");
const { getAirData} = require("./awair-api.js");

// Define the connection parameters
const connectionParams = {
  user: "postgres",
  host: "timescaledb",
  database: "postgres",
  // read password from local .env file
  password: process.env.POSTGRES_PASSWORD,
  port: 5432, // or the port number you specified when running the Docker container
};

async function setupTable() {
  // Create a new PostgreSQL client instance
  const client = new Client(connectionParams);

  try {
    // Connect to the database
    await client.connect();

    // Define the SQL queries as strings
    const createTableQuery = `
      CREATE TABLE awair_id_117 (   
        timestamp TIMESTAMPTZ NOT NULL,   
        temp FLOAT NOT NULL,   
        humid FLOAT NOT NULL,   
        co2 INTEGER NOT NULL,   
        voc INTEGER NOT NULL,   
        pm25 INTEGER NOT NULL 
      );
    `;

    const createHypertableQuery = `
      SELECT create_hypertable('awair_id_117', 'timestamp');
    `;

    const addUniqueConstraintQuery = `
      ALTER TABLE awair_id_117 ADD CONSTRAINT unique_timestamp UNIQUE (timestamp);
    `;

    // Run the queries using the client instance
    await client.query(createTableQuery);
    console.log("Table created successfully");
    await client.query(createHypertableQuery);
    console.log("Hypertable created successfully");
    await client.query(addUniqueConstraintQuery);
    console.log("Unique constraint added successfully");
  } catch (err) {
    console.error(err);
  } finally {
    // Close the client connection
    await client.end();
  }
}

async function save(data, tableName) {
  // Create a new PostgreSQL client instance
  const client = new Client(connectionParams);

  try {
    // Convert the data into an array of value strings
    const values = data.map((entry) => {
      const [timestamp, temp, humid, co2, voc, pm25] = entry.split(",");
      return `('${timestamp}', ${temp}, ${humid}, ${co2}, ${voc}, ${pm25})`;
    });

    // Build the INSERT statement and execute it
    const insertQuery = `INSERT INTO ${tableName} (timestamp, temp, humid, co2, voc, pm25)
                           VALUES ${values.join(",")}
                           ON CONFLICT (timestamp) DO NOTHING;`;

    // Connect to the database
    await client.connect();
    await client.query(insertQuery);

    console.log("Data inserted successfully");
  } catch (err) {
    console.error(err);
  } finally {
    // Close the client connection
    await client.end();
  }
}

async function read(numRows, tableName) {
  // Create a new PostgreSQL client instance
  const client = new Client(connectionParams);

  try {

    // Connect to the database
    await client.connect();

    // Construct the SELECT query with the LIMIT clause
    const selectQuery = `SELECT * FROM ${tableName} ORDER BY timestamp DESC LIMIT $1;`;
    const values = [numRows];

    // Execute the SELECT query with the specified number of rows
    const res = await client.query(selectQuery, values);

    // Log the query results to the console
    console.log("Query results:");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    // Close the client connection
    await client.end();
  }
}

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

async function main() {
  // await setupTable()
  await save(await getAirData("117"), "awair_id_117");
  await read(500, "awair_id_117");
  // console.log(process.env.POSTGRES_PASSWORD)
}

// run main function every 5 minutes
setInterval(main, 300000);
main();

/*
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



// Start timescaledb container
// Same network as grafana
// Using volume so database persists container deletion
docker run -d --name timescaledb -p 5432:5432 --network grafana-timescaledb-network -e POSTGRES_PASSWORD=password -v timescaledb-storage:/var/lib/postgresql/data timescale/timescaledb:latest-pg14

// 
docker run -d --name=grafana -v grafana-storage:/var/lib/grafana --network grafana-timescaledb-network -p 3000:3000 grafana/grafana
*/
