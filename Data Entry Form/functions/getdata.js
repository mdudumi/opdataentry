 const columnToInputId = {
    entry_date:      'entry_date',
    pad:             'pad',
    well:            'well',
    tubing_pressure: 'tub_press',
    casing_pressure: 'cas_press',
    speed:           'speed',
    fluid_level:     'fluid_level',
    torque:          'torque',
    oil_pressure:    'oil_press',
    oil_level:       'oil_level',
    frequency:       'frecuenze',
    tank_volume:     'tank_volume',
    free_water:      'free_water',
    bsw_tank:        'bsw_tank',
    tank_temp:       'tank_temp',
    water_diluent:   'water_diluent',
    diesel_propane:  'diesel_propane',
    chmc:            'chmc'
  };

  async function loadEntry() {
    try {
      const res = await fetch('/.netlify/functions/getEntries');
      console.log('GET /getEntries →', res.status);
      const rows = await res.json();
      console.log('rows:', rows);
      const e = rows[0] || {};
      Object.entries(columnToInputId).forEach(([col, id]) => {
        const input = document.getElementById(id);
        if (!input) return;
        input.value = e[col] != null
          ? (col === 'entry_date'
              ? new Date(e[col]).toISOString().slice(0,10)
              : e[col])
          : '';
      });
      if (e.id) document.getElementById('wellForm').dataset.id = e.id;
    } catch (err) {
      console.error('Error loading entry:', err);
      alert('Error loading data (see console)');
    }
  }

  document.getElementById('wellForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    const form = ev.target;
    const payload = { id: form.dataset.id };
    Object.entries(columnToInputId).forEach(([col, id]) => {
      payload[col] = document.getElementById(id).value;
    });

    try {
      console.log('Submitting payload:', payload);
      const upd = await fetch('/.netlify/functions/updateEntry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify(payload),
      });
      console.log('POST /updateEntry →', upd.status);
      const text = await upd.text();
      console.log('Response body:', text);

      if (!upd.ok) {
        throw new Error(`Status ${upd.status}: ${text}`);
      }
      alert('✅ Saved!');
      loadEntry();
    } catch (err) {
      console.error('Error updating entry:', err);
      alert('❌ Error: ' + err.message);
    }
  });

  window.addEventListener('DOMContentLoaded', loadEntry);
