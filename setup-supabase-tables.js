const { Client } = require('pg');

// Supabase connection string (non-pooling)
const connectionString = "postgres://postgres.rjhkagqsiamwpiiszbgs:eUAUpixlcPkwgMhs@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require";

const client = new Client({
  connectionString: connectionString,
  ssl: { 
    rejectUnauthorized: false,
    ca: undefined
  }
});

async function createTables() {
  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected successfully!');

    // Read the SQL file
    const fs = require('fs');
    const sql = fs.readFileSync('create-tables.sql', 'utf8');

    console.log('Creating tables...');
    await client.query(sql);
    console.log('Tables created successfully!');

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Projection', 'Status', 'Comment', 'SignedFee', 'AsrFee', 'ClosedProject', 'ProjectAssignment', 'ProjectManager')
      ORDER BY table_name;
    `);

    console.log('Created tables:', result.rows.map(row => row.table_name));

  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await client.end();
  }
}

createTables();
