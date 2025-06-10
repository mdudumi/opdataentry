const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// PostgreSQL connection pool
const pool = new Pool({
    user: 'postgres',
    host: '34.32.41.224',
    database: 'OPDES',
    password: 'South123',
    port: 5432,
});

// Middleware
app.use(cors());
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

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
