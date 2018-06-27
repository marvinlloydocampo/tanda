const pg = require('pg');
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/tanda';

const client = new pg.Client(connectionString);
client.connect();
const query = client.query(
  'CREATE TABLE devices(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(40))');
query.on('end', () => { client.end(); });

const epoch = client.query('CREATE TABLE epochs(id SERIAL PRIMARY KEY, device_id UUID not null REFERENCES devices(id), unix_timestamp INT not null, utc_date TIMESTAMP)');
epoch.on('end', () => { client.end(); });
