module.exports = {
  apps: [
    {
      name: 'awair',
      script: 'npm',
      args: 'run start -w superscraper-awair',
      interpreter: 'none',
    },
    {
      name: 'healthkit',
      script: 'npm',
      args: 'run start -w superscraper-healthkit',
      interpreter: 'none',
    },
    {
      name: 'maps',
      script: 'npm',
      args: 'run start -w superscraper-maps',
      interpreter: 'none',
    },
    {
      name: 'money',
      script: 'npm',
      args: 'run start -w superscraper-money',
      interpreter: 'none',
    },
    {
      name: 'oura',
      script: 'npm',
      args: 'run start -w superscraper-oura',
      interpreter: 'none',
    },
    {
      name: 'withings',
      script: 'npm',
      args: 'run start -w superscraper-withings',
      interpreter: 'none',
    },
    {
      name: 'screentime',
      script: 'npm',
      args: 'run start -w superscraper-screentime',
      interpreter: 'none',
    },
    // Add more workspaces as needed
  ],
};
