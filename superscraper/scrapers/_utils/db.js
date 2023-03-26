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
    await pool.query(createSchemaQuery);
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

    const { rows } = await pool.query(checkTableExistsQuery);
    const tableExists = rows[0].exists;
    return tableExists;
}

async function createTable(schema, tableName, columns) {

    // Generate the CREATE TABLE query
    const columnDefinitions = columns.map(col => `${col.name} ${col.type}`).join(', ');

    let createTableQuery = `CREATE TABLE IF NOT EXISTS ${schema}.${tableName} (
                            ${columnDefinitions}, 
                            UNIQUE (time, source) 
                            );`;

    // Create Table
    await pool.query(createTableQuery);
    console.log(createTableQuery);

    // Convert table to hypertable
    await pool.query(`SELECT create_hypertable('${SCHEMA}.${tableName}', 'time');`);
}


async function saveData(schema, name, data) {
    // if (Object.keys(data).length === 0) {
    //     console.log(`No data for ${name}, skipping table creation and insertion.`);
    //     return;
    // }

    console.log(`Creating schema ${schema}`);
    createSchema(schema);

    // Check if the table exists
    console.log(`Checking if table ${schema}.${name} exists`);
    const tableExists = await doesTableExist(schema, name);
    if (!tableExists) {
        const columns = Object.entries(data).map(([key, value]) => ({ name: key, type: value.type }));
        console.log(`Table ${schema}.${name} does not exist, creating it.`);
        await createTable(schema, name, columns);
    }

    // Insert data
    const rowData = Object.entries(data).map(([key, value]) => value.value);
    console.log(rowData);

    // Replace undefined or empty string values with null
    const values = rowData.map(value => (value !== undefined && value !== '') ? value : null);
    console.log(values);

    // Generate the INSERT query
    const columnNames = Object.keys(data); // eg: ['time', 'duration', 'qty', 'units', 'source']
    console.log(columnNames)
    const placeholders = columnNames.map((_, i) => '$' + (i + 1)).join(', '); // eg: $1, $2, $3, etc.
    console.log(placeholders)
    const insertQuery = `INSERT INTO ${schema}.${name} (${columnNames.join(', ')}) 
                         VALUES (${placeholders})
                         ON CONFLICT (time, source) DO NOTHING;
                         `;
    console.log(insertQuery);

    // Execute the INSERT query
    await pool.query({ text: insertQuery, values: values });

    console.log(`Inserted 1 row into ${name}.`);
}

// export all the functions
module.exports = { createSchema, doesTableExist, createTable, saveData };
// export { createSchema, doesTableExist, createTable, saveData };