const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Middleware
app.use(cors({ origin: 'https://opdes.netlify.app/south1.html' }));
app.use(bodyParser.json());

// API Endpoints
app.get('/entries', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM south1_entries');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query error' });
    }
});

app.post('/entries', async (req, res) => {
    const data = req.body;
    try {
        await pool.query(
            'INSERT INTO south1_entries (entry_date, pad, well, tub_press, cas_press, speed, fluid_level, torque, oil_press, oil_level, frecuenze, tank_volume, free_water, bsw_tank, tank_temp, water_diluent, diesel_propane, chmc) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)',
            [
                data.entry_date, data.pad, data.well, data.tub_press, data.cas_press,
                data.speed, data.fluid_level, data.torque, data.oil_press, data.oil_level,
                data.frecuenze, data.tank_volume, data.free_water, data.bsw_tank,
                data.tank_temp, data.water_diluent, data.diesel_propane, data.chmc,
            ]
        );
        res.status(201).json({ message: 'Entry added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database insert error' });
    }
});

app.delete('/entries/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query('DELETE FROM south1_entries WHERE id=$1', [id]);
        res.status(200).json({ message: 'Entry deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database delete error' });
    }
});

app.put('/entries/:id', async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    try {
        await pool.query(
            `UPDATE south1_entries SET 
                entry_date = $1,
                pad = $2,
                well = $3,
                tub_press = $4,
                cas_press = $5,
                speed = $6,
                fluid_level = $7,
                torque = $8,
                oil_press = $9,
                oil_level = $10,
                frecuenze = $11,
                tank_volume = $12,
                free_water = $13,
                bsw_tank = $14,
                tank_temp = $15,
                water_diluent = $16,
                diesel_propane = $17,
                chmc = $18
            WHERE id = $19`,
            [
                data.entry_date, data.pad, data.well, data.tub_press, data.cas_press,
                data.speed, data.fluid_level, data.torque, data.oil_press, data.oil_level,
                data.frecuenze, data.tank_volume, data.free_water, data.bsw_tank,
                data.tank_temp, data.water_diluent, data.diesel_propane, data.chmc,
                id
            ]
        );
        res.status(200).json({ message: 'Entry updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database update error' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
