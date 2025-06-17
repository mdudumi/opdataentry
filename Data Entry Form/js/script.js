// js/script.js
document.addEventListener('DOMContentLoaded', () => {
  // --- Grab your DOM nodes ---
  const form        = document.getElementById('wellForm');
  const tableBody   = document.querySelector('#previewTable tbody');
  const padSelect   = document.getElementById('pad');
  const wellSelect  = document.getElementById('well');
  const dateFilter  = document.getElementById('dateFilter');
  const padFilter   = document.getElementById('padFilter');
  const wellFilter  = document.getElementById('wellFilter');
  const toggleBtn   = document.getElementById('toggleMode');
  const exportBtn   = document.getElementById('exportBtn');

  // --- The fields you collect ---
  const fields = [
    'entry_date','pad','well','tub_press','cas_press','speed','fluid_level',
    'torque','oil_press','oil_level','frecuenze','tank_volume','free_water',
    'bsw_tank','tank_temp','water_diluent','diesel_propane','chmc'
  ];

  // --- Local cache for immediate UI feedback ---
  let entries = JSON.parse(localStorage.getItem('wellEntries')) || [];

  // --- Compute API base URL ---
  // If you open over HTTP(S), use same origin. Otherwise (file://) fallback:
  const API_BASE = window.location.protocol.startsWith('http')
    ? window.location.origin
    : 'http://localhost:3000';

  // ——————— Handle form submit ———————
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Build payload
    const data = {};
    fields.forEach(id => {
      data[id] = form[id]?.value || '';
    });

    try {
      const res = await fetch(`${API_BASE}/api/well-entries`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data)
      });

      if (!res.ok) {
        throw new Error(`Server responded ${res.status}`);
      }

      // On success, update localStorage & UI
      entries.push(data);
      localStorage.setItem('wellEntries', JSON.stringify(entries));
      renderTable();
      form.reset();
    } catch (err) {
      console.error('Failed to save entry:', err);
      alert('⚠️ Could not save entry to the database.');
    }
  });

  // ——————— Render the table (with filters & inline edits) ———————
  function renderTable() {
    tableBody.innerHTML = '';
    const df = dateFilter?.value;
    const pf = padFilter?.value;
    const wf = wellFilter?.value;

    // Filter
    const list = entries.filter(e =>
      (!df || e.entry_date === df) &&
      (!pf || e.pad        === pf) &&
      (!wf || e.well       === wf)
    );

    // Rebuild filter selects
    const unique = key => [...new Set(entries.map(e => e[key]).filter(Boolean))];
    if (dateFilter) dateFilter.innerHTML =
      `<option value="">All Dates</option>` + unique('entry_date').map(v =>
        `<option>${v}</option>`
      ).join('');
    if (padFilter) padFilter.innerHTML =
      `<option value="">All PADs</option>` + unique('pad').map(v =>
        `<option>${v}</option>`
      ).join('');
    if (wellFilter) wellFilter.innerHTML =
      `<option value="">All Wells</option>` + unique('well').map(v =>
        `<option>${v}</option>`
      ).join('');

    // Build rows
    list.forEach((entry, i) => {
      const tr = document.createElement('tr');

      fields.forEach(key => {
        const td = document.createElement('td');
        td.textContent = entry[key] || '';
        td.contentEditable = true;
        td.addEventListener('blur', () => {
          entries[i][key] = td.textContent.trim();
          localStorage.setItem('wellEntries', JSON.stringify(entries));
          // Optionally send a PUT /api/well-entries/:id here
        });
        tr.appendChild(td);
      });

      // Delete button
      const action = document.createElement('td');
      const btn = document.createElement('button');
      btn.textContent = 'Delete';
      btn.addEventListener('click', () => {
        entries.splice(i, 1);
        localStorage.setItem('wellEntries', JSON.stringify(entries));
        renderTable();
        // Optionally send DELETE /api/well-entries/:id
      });
      action.appendChild(btn);
      tr.appendChild(action);

      tableBody.appendChild(tr);
    });
  }

  // ——————— Export CSV ———————
  exportBtn?.addEventListener('click', () => {
    const csv = [
      fields.join(','),
      ...entries.map(e => fields.map(f => e[f]).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'well_data.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // ——————— Pad → Well dynamic dropdown ———————
  padSelect?.addEventListener('change', () => {
    const pad = padSelect.value;
    wellSelect.innerHTML = '<option value="">-- Select Well --</option>';
    if (pad) {
      for (let i = 1; i <= 5; i++) {
        const name = `${pad}_Well_${i}`;
        wellSelect.appendChild(new Option(name, name));
      }
    }
  });

  // ——————— Apply filters on change ———————
  [dateFilter, padFilter, wellFilter].forEach(sel =>
    sel?.addEventListener('change', renderTable)
  );

  // ——————— Dark‐mode toggle ———————
  toggleBtn?.addEventListener('click', () =>
    document.body.classList.toggle('dark-mode')
  );

  // ——————— Initial render ———————
  renderTable();
});
