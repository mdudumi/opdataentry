/**
 * server.js
 * Simple Express API for Neon Postgres (south1_entries table).
 *
 * Setup:
 * 1. npm init -y
 * 2. npm install express pg cors dotenv
 * 3. Create a .env file in the same directory with:
 *    DATABASE_URL="postgresql://<username>:<password>@<your-neon-host>:5432/nenondb?sslmode=require"
 * 4. Run the server: node server.js
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Health check endpoint
app.get('/', (req, res) => res.send('API is up!'));

// GET all entries
app.get('/entries', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM south1_entries ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching entries:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST a new entry
app.post('/entries', async (req, res) => {
  const cols = [
    'entry_date','pad','well','tub_press','cas_press','speed',
    'fluid_level','torque','oil_press','oil_level','frecuencia',
    'tank_volume','free_water','bsw_tank','tank_temp',
    'water_diluent','diesel_propane','chmc'
  ];
  const vals = cols.map(c => req.body[c] ?? null);
  const placeholders = cols.map((_, i) => `$${i+1}`).join(',');
  const query = `
    INSERT INTO south1_entries (${cols.join(',')})
    VALUES (${placeholders})
    RETURNING *
  `;
  try {
    const { rows } = await pool.query(query, vals);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error inserting entry:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PATCH (update) an entry field
app.patch('/entries/:id', async (req, res) => {
  const { id } = req.params;
  const [ field, value ] = Object.entries(req.body)[0] || [];
  if (!field) return res.status(400).json({ error: 'No field provided' });
  const query = `UPDATE south1_entries SET ${field} = $1 WHERE id = $2 RETURNING *`;
  try {
    const { rows } = await pool.query(query, [value, id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating entry:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE an entry
app.delete('/entries/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM south1_entries WHERE id = $1', [id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting entry:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));