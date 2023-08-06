const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const db = require('../_utils/db.js');
const execPromisified = util.promisify(exec);
const { spawn } = require('child_process');

const MONEY_SCHEMA_NAME = "money";
const TRANSACTION_TABLE_NAME = 'transactions';
const BALANCE_TABLE_NAME = 'balances';
const BALANCE_UNIQUE_COLUMNS = ['time', 'accountId'];
const TRANSACTION_UNIQUE_COLUMNS = ['time', 'transactionId'];
const JSON_FILE_PATH = './mintable/csv/raw-transactions.json';
const WISE_ACCESS_TOKEN = process.env.WISE_ACCESS_TOKEN;

async function main() {
  try {
    console.log("Fetching money...");
    await fetchMintable().catch(error => {
      // Data cannot be fetched, so skip this run
      // console.error(`Error fetching Mintable data: ${error}`);
      throw error;
    });

    // Load and parse JSON data
    const fileData = await fs.readFile(JSON_FILE_PATH, 'utf-8');
    const jsonData = await JSON.parse(fileData);
    const currentTime = new Date().toISOString();

    // Iterate over each account
    for (const accountData of jsonData) {
      const currentInUSD = await convertToUsd(accountData.current, accountData.currency, currentTime);
      const availableInUSD = await convertToUsd(accountData.available, accountData.currency, currentTime);

      // Prepare balance data
      const balanceData = [
        { name: "time",           value: currentTime,             type: 'TIMESTAMPTZ' },
        { name: "integration",    value: accountData.integration, type: 'TEXT' },
        { name: "accountId",      value: accountData.accountId,   type: 'TEXT' },
        { name: "mask",           value: accountData.mask,        type: 'TEXT' },
        { name: "institution",    value: accountData.institution, type: 'TEXT' },
        { name: "account",        value: accountData.account,     type: 'TEXT' },
        { name: "type",           value: accountData.type,        type: 'TEXT' },
        { name: "current",        value: accountData.current,     type: 'FLOAT' },
        { name: "available",      value: accountData.available,   type: 'FLOAT' },
        { name: "currentinusd",   value: currentInUSD,            type: 'FLOAT' },
        { name: "availableinusd", value: availableInUSD,          type: 'FLOAT' },
        { name: "currency",       value: accountData.currency,    type: 'TEXT' },
      ];

      // Save balance data
      console.log("Saving balance data:", accountData.accountId);
      // console.log(balanceData);
      await db.saveData(MONEY_SCHEMA_NAME, BALANCE_TABLE_NAME, [balanceData], BALANCE_UNIQUE_COLUMNS)
        .catch(error => {
          console.error(`Error saving balance data to database: ${error}`);
        });

      ////////////////////////////////////////////////////////////////////////
      // Prepare all transactions data
      const transactionsData = [];

      for (const transaction of accountData.transactions) {
        const amountInUSD = await convertToUsd(transaction.amount, transaction.currency, transaction.date);

        const transactionData = [
          { name: "time", value: transaction.date, type: 'TIMESTAMPTZ' },
          { name: "integration", value: transaction.integration, type: 'TEXT' },
          { name: "name", value: transaction.name, type: 'TEXT' },
          { name: "amount", value: transaction.amount, type: 'FLOAT' },
          { name: "amountinusd", value: amountInUSD, type: 'FLOAT' },
          { name: "currency", value: transaction.currency, type: 'TEXT' },
          { name: "type", value: transaction.type, type: 'TEXT' },
          { name: "accountId", value: transaction.accountId, type: 'TEXT' },
          { name: "transactionId", value: transaction.transactionId, type: 'TEXT' },
          { name: "category", value: transaction.category, type: 'TEXT' },
          { name: "pending", value: transaction.pending, type: 'BOOLEAN' },
          { name: "institution", value: transaction.institution, type: 'TEXT' },
          { name: "account", value: transaction.account, type: 'TEXT' },
          // Additional fields can be added here
        ];

        transactionsData.push(transactionData);
      }

      // Save all transactions data in a single call
      console.log("Saving transaction data for accountId: ", accountData.accountId);
      await db.saveData(MONEY_SCHEMA_NAME, TRANSACTION_TABLE_NAME, transactionsData, TRANSACTION_UNIQUE_COLUMNS)
        .catch(error => {
          console.error(`Error saving transaction data to database: ${error}`);
        });
    }

    // Delete ./mintable/csv/account-balances.csv, ./mintable/csv/transactions.csv, and ./mintable/csv/raw-transactions.json
    await execPromisified("rm ./mintable/csv/account-balances.csv ./mintable/csv/transactions.csv ./mintable/csv/raw-transactions.json");
    console.log("Success: All mintable data saved to DB.");

  } catch (error) {
    console.error(`An unexpected error occurred: ${error}`);
  }
}

// Initial run
main()
  .catch(error => console.error(`[${path.basename(__filename)}]: ${error}`))
  .finally(() => setTimeout(main, 6 * 60 * 60 * 1000)); // Run every 6 hours

async function fetchMintable() {
  try {
    const { stdout, stderr } = await execPromisified("node ./mintable/lib/scripts/cli.js fetch --config-file ./mintable/secrets/mintable.jsonc");
    // console.log(`stdout: ${stdout}`);
    if (stdout.includes('Successfully exported')) {
      // TODO Do something
      console.log("Success: data fetched from Mintable.");
    } // else if mintable throws a ITEM_LOGIN_REQUIRED error
    else if (stderr.includes('ITEM_LOGIN_REQUIRED')) {
      console.error('One of the accounts has de-authed, new login required. Sending login URL');
      plaidAccountSetup();
    }
    else {
      throw Error(stdout);
    }
  } catch (error) {
    // console.log(`error: ${error.message}`);
    throw error;
  }
}

async function plaidAccountSetup() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['./mintable/lib/scripts/cli.js', 'account-setup', '--config-file', './mintable/secrets/mintable.jsonc']);

    const timeout = setTimeout(() => {
      child.kill(); // Ensure to kill the process after the timeout
      reject(new Error('Process timed out after 1 hour'));
    }, 3600000); // Set timeout to 1 hour

    child.stdout.on('data', async (data) => {
      const message = data.toString();

      if (message.includes('Account setup in progress')) {
        // build url domain:8000/?environment=development
        const domain = "http://139.59.235.86"
        const url = `${domain}:8000/?environment=development`;
        const ntfyEndPoint = 'large-language-mofongo';

        // TODO: update this to use action buttons
        // Button 1: Same link as below
        // Button 2: ntfy.sh/large-language-mofongo/stop (closes the process)
        // https://docs.ntfy.sh/publish/#action-buttons
        axios({
          url: `ntfy.sh/${ntfyEndPoint}`,
          method: 'post',
          headers: {
            "Click": url
          },
          data: 'acorns fucked again'
        })
          .then(response => console.log(response))
          .catch(error => console.log(error));
      }

      else if (message.includes('Plaid access token saved')) {
        clearTimeout(timeout); // Clear the timeout if the process finishes successfully
        resolve();
      }
    });

    child.stderr.on('data', (data) => {
      clearTimeout(timeout); // Clear the timeout if there are any errors
      reject(data.toString());
    });
  });
}

async function convertToUsdSimple(amount, currency) {
  if (currency === 'USD') {
    return amount;
  }

  try {
    const response = await axios.get(`https://open.er-api.com/v6/latest/${currency}`);
    const data = response.data;

    if (data.result !== 'success') {
      throw new Error(`Error fetching exchange rate data: ${data.error}`);
    }

    if (!data.rates['USD']) {
      throw new Error(`Currency ${currency} not found in exchange rate API.`);
    }

    return amount * data.rates['USD'];
  } catch (error) {
    throw new Error(`Error fetching exchange rate data: ${error}`);
  }
}

// TODO: change to https://exchangeratesapi.io/
async function convertToUsd(amount, currency, time) {
  if (currency === 'USD') {
    return amount;
  }

  try {
    const response = await axios.get(`https://api.transferwise.com/v1/rates?source=${currency}&target=USD&time=${time}`, {
      headers: {
        'Authorization': 'Bearer ' + WISE_ACCESS_TOKEN
      }
    });

    const data = response.data;

    if (data.length === 0) {
      throw new Error(`Error fetching exchange rate data.`);
    }

    return amount * data[0].rate;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      throw new Error(`Invalid currency or bad request: ${error}`);
    }

    throw new Error(`Error fetching exchange rate data: ${error}`);
  }
}

