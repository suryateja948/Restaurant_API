// require('dotenv').config({ path: '.env.development' });

// process.env.NODE_ENV = 'test';


process.env.NODE_ENV = 'test';

// Explicitly load the .env.test file before anything else
require('dotenv').config({ path: 'test/.env.test' });

