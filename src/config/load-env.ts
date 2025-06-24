import * as dotenv from 'dotenv';

export function loadEnvFile() {
  const env = process.env.NODE_ENV;

  let envFile = '.env.development'; // default for dev

  if (env === 'test') {
    envFile = 'test/.env.test'; // adjust this if your .env.test is inside /test folder
  }

  dotenv.config({ path: envFile });
  console.log(`✅ Loaded env file: ${envFile}`);
}

