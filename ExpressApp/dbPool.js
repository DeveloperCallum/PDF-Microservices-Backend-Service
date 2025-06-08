const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST || 'postgres',
    port: process.env.POSTGRES_PORT || '5432',
    database: process.env.POSTGRES_DATABASE || 'job_store',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

//TODO: Remove this, i hate this.
module.exports.getPool = () => { return pool}; 