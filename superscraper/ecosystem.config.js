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
      // Add more workspaces as needed
    ],
  };
  