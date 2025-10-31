/* eslint-disable @typescript-eslint/no-require-imports */
import dotenv from 'dotenv';
import path from 'path';


const env = process.env.NODE_ENV || 'local';
const envFile = path.resolve(process.cwd(), `.env.${env}`);

dotenv.config({ path: envFile, override: true });
