const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER || 'toledo_pg',
  host: process.env.PGHOST || 'postgres',
  database: process.env.PGDATABASE || 'TallerMilcaPG',
  password: process.env.PGPASSWORD || '123pg',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

module.exports = { pool };
