const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const Papa = require('papaparse');

async function runScript() {
    exec("node ./mintable/lib/scripts/cli.js fetch --config-file ./mintable/secrets/mintable.jsonc", async (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);

        let total = 0;
        const file = fs.createReadStream('./mintable/csv/account-balances.csv');

        Papa.parse(file, {
            delimiter: ",",
            header: true,
            complete: async (results) => {
                for (let row of results.data) {
                    const current = await convertToUsd(parseFloat(row.current), row.currency);
                    total += (row.type === 'credit_card' ? -current : current);
                }

                console.log('CSV file successfully processed');
                saveToDb(total);
                processTransactions('./mintable/csv/transactions.csv');
            },
        });
    });
}

runScript();

async function convertToUsd(amount, currency) {
    if (currency === 'USD') {
        return amount;
    }

    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${currency}`);
    const data = response.data;

    return amount * data.rates['USD'];
}

function saveToDb(total) {
    console.log(`Saved to DB: ${total}`);
}

function processTransactions(filename) {
    console.log(`Processing transactions from: ${filename}`);
}
