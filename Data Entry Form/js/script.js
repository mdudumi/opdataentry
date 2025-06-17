// js/script.js
document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:3000';
  const form       = document.getElementById('wellForm');
  const padSelect  = document.getElementById('pad');
  const wellSelect = document.getElementById('well');
  const tableBody  = document.querySelector('#previewTable tbody');
  const fields = [
    'entry_date','pad','well','tub_press','cas_press','speed',
    'fluid_level','torque','oil_press','oil_level','frecuenze',
    'tank_volume','free_water','bsw_tank','tank_temp',
    'water_diluent','diesel_propane','chmc'
  ];
  let entries = [];

  // Pad→Well
  padSelect.addEventListener('change', () => {
    wellSelect.innerHTML = '<option value="">-- Select Well --</option>';
    if (!padSelect.value) return;
    for (let i = 1; i <= 5; i++) {
      const val = `${padSelect.value}_Well_${i}`;
      wellSelect.appendChild(new Option(val, val));
    }
  });

  // Load all
  async function loadEntries() {
    const res = await fetch(`${API}/entries`);
    entries = await res.json();
    render();
  }

  // Render
  function render() {
    tableBody.innerHTML = '';
    entries.forEach((e, i) => {
      const row = tableBody.insertRow();
      fields.forEach(key => {
        const cell = row.insertCell();
        cell.contentEditable = true;
        cell.textContent = e[key] ?? '';
        cell.addEventListener('blur', async () => {
          const v = cell.textContent.trim();
          if (v === (e[key] ?? '')) return;
          await fetch(`${API}/entries/${e.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [key]: v })
          });
          e[key] = v;
        });
      });
      // Delete
      const d = row.insertCell();
      const btn = document.createElement('button');
      btn.textContent = '🗑️';
      btn.addEventListener('click', async () => {
        await fetch(`${API}/entries/${e.id}`, { method: 'DELETE' });
        entries.splice(i,1);
        render();
      });
      d.appendChild(btn);
    });
  }

  // Create
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const payload = {};
    fields.forEach(f => payload[f] = form[f].value || null);
    const res = await fetch(`${API}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    entries.push(await res.json());
    render();
    form.reset();
    wellSelect.innerHTML = '<option value="">-- Select Well --</option>';
  });

  loadEntries();
});
