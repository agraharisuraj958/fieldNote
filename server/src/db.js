import pg from 'pg';
const { Pool } = pg;
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep serverless instances from opening too many connections to hosted Postgres.
  max: Number(process.env.PG_POOL_MAX) || (process.env.VERCEL ? 3 : 10),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});
export async function transaction(fn) { const c=await pool.connect(); try { await c.query('BEGIN'); const value=await fn(c); await c.query('COMMIT'); return value; } catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); } }
