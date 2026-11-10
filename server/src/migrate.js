import 'dotenv/config'; import fs from 'node:fs/promises'; import {pool} from './db.js';
try { await pool.query(await fs.readFile(new URL('../migrations/001_initial.sql',import.meta.url),'utf8')); console.log('Database schema is up to date.'); } finally { await pool.end(); }
