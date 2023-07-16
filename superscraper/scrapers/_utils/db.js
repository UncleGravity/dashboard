const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_URL,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT
});

async function createSchema(schema) {
    const createSchemaQuery = `CREATE SCHEMA IF NOT EXISTS ${schema}`;
    try {
        await pool.query(createSchemaQuery);
    } catch (error) {
        console.error(`Error occurred while creating schema: ${schema}`, error);
        throw error;
    }
}

async function doesTableExist(schema, tableName) {
    // Check if the table exists
    const checkTableExistsQuery = `
        SELECT EXISTS(
            SELECT * FROM 
            _timescaledb_catalog.hypertable 
            WHERE 
            table_name = '${tableName}'
            AND
            schema_name = '${schema}'
        );
      `;

      try {
        const { rows } = await pool.query(checkTableExistsQuery);
        const tableExists = rows[0].exists;
        return tableExists;
      } catch (error) {
        console.error(error);
        return false;
      }
}

async function createTable(schema, tableName, columns, uniqueColumns) {
    // Check columns include "time"
    if (!columns.find(col => col.name === 'time')) {
        throw new Error('Table must include a "time" column');
    }

    if (!columns || columns.length === 0) {
        console.error('No columns provided to create table');
        return;
    }

    // Check if the table exists
    const tableExists = await doesTableExist(schema, tableName);
    if (tableExists) {
        // console.log(`Table ${schema}.${tableName} already exists, skipping table creation.`);
        return;
    }

    // Generate the CREATE TABLE query
    const uniqueColumnsString = uniqueColumns.map(col => `${col}`).join(', ');
    const columnDefinitions = columns.map(col => `${col.name} ${col.type}`).join(', ');
    let createTableQuery = `CREATE TABLE IF NOT EXISTS ${schema}.${tableName} (
                            ${columnDefinitions},
                            UNIQUE (${uniqueColumnsString}) 
                            );`;

    try {
        // Create Table
        await pool.query(createTableQuery);
        // console.log(createTableQuery);

        // Convert table to hypertable
        await pool.query(`SELECT create_hypertable('${schema}.${tableName}','time');`);
    } catch (error) {
        console.error(`Error occurred while creating table ${schema}.${tableName}`, error);
        throw error;
    }
}

/*
Example "data" format
let healthKitData = [
    [
        { name: "time",         value: date,        type: 'TIMESTAMP WITH TIME ZONE' },
        { name:  "endDate",     value: endDate,     type: 'TIMESTAMP WITH TIME ZONE' },
        { name: "timezone",     value: timezone,    type: 'TEXT' },
        { name: "value",        value: qty,         type: 'DOUBLE PRECISION' },
        { name: "units",        value: units,       type: 'TEXT' },
        { name: "source",       value: source,      type: 'TEXT' }
    ],
    [
        { name: "time",         value: date,        type: 'TIMESTAMP WITH TIME ZONE' },
        { name:  "endDate",     value: endDate,     type: 'TIMESTAMP WITH TIME ZONE' },
        { name: "timezone",     value: timezone,    type: 'TEXT' },
        { name: "value",        value: qty,         type: 'DOUBLE PRECISION' },
        { name: "units",        value: units,       type: 'TEXT' },
        { name: "source",       value: source,      type: 'TEXT' }
    ]
];
*/

async function saveData(schema, tableName, data, uniqueColumns) {
    
    // Check if there is any data to insert
    if (!data || data.length === 0 || data[0].length === 0) {
        console.log(`No data for ${tableName}, skipping table creation and insertion.`);
        return;
    }
    
    // Create Schema
    // console.log(`Creating schema ${schema}`);
    await createSchema(schema);

    // Create table if it doesn't exist
    await createTable(schema, tableName, data[0], uniqueColumns);

    const BATCH_SIZE = 1000;  // Adjust the batch size based on your requirements

    // Split data into smaller chunks (too large could cause memory issues)
    const chunks = [];
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        chunks.push(data.slice(i, i + BATCH_SIZE));
    }
    
    // Run a batch insert for each chunk
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const query = prepareInsertQuery(schema, tableName, chunk, uniqueColumns);

        try {
          // Execute the INSERT query
          await pool.query(query.text, query.values);
          console.log(`Inserted chunk ${i + 1}/${chunks.length} with ${chunk.length} rows into ${schema}.${tableName}.`);
        } catch (error) {
          console.error(`Error occurred while inserting rows into ${schema}.${tableName}`, error);
          throw error;
        }
    }
}

function prepareInsertQuery(schema, tableName, data, uniqueColumns) {
    const columnNames = data[0].map(d => d.name);
    let placeholders = [];
    let values = [];

    for (let index = 0; index < data.length; index++) {
        const row = data[index];
        const rowData = row.map(d => d.value);
        const rowValues = rowData.map(value => (value !== undefined && value !== '') ? value : null);
        const rowPlaceholders = row.map((_, i) => '$' + (i + 1 + index * row.length)).join(', ');

        values.push(...rowValues);
        placeholders.push(`(${rowPlaceholders})`);
    }

    const uniqueColumnsString = uniqueColumns.map(col => `${col}`).join(', ');
    const insertQuery = `INSERT INTO ${schema}.${tableName} (${columnNames.join(', ')}) 
                         VALUES ${placeholders.join(', ')}
                         ON CONFLICT (${uniqueColumnsString}) DO NOTHING;`;

    // console.log("Data:", data);
    // console.log("Column Names:", columnNames);
    // console.log("Values:", values);
    // console.log("Placeholders:", placeholders);
    // console.log("Final Insert Query:", insertQuery);
                         

    return { text: insertQuery, values: values };
}

async function readData(schema, tableName, numRows) {
    const readQuery = `SELECT * FROM ${schema}.${tableName} ORDER BY time DESC LIMIT ${numRows}`;

    try {
        const { rows } = await pool.query(readQuery);
        console.log(`Fetched ${rows.length} rows from ${tableName}.`);
        return rows;
    } catch (error) {
        console.error(`Error occurred while fetching rows from ${tableName}`, error);
        throw error;
    }
}

// export all the functions
module.exports = { createSchema, doesTableExist, createTable, saveData, readData };
// export { createSchema, doesTableExist, createTable, saveData };