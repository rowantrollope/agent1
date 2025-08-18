#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const { CliAgent } = require('../dist/lib/cli.js');

async function main() {
  try {
    const cli = new CliAgent();
    await cli.start();
  } catch (error) {
    console.error('Failed to start CLI:', error.message);
    process.exit(1);
  }
}

main();