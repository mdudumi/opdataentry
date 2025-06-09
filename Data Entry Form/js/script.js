document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('wellForm');
  const tableBody = document.querySelector('#previewTable tbody');
  const wellSelect = document.getElementById('well');
  const padSelect = document.getElementById('pad');
  const dateFilter = document.getElementById('dateFilter');
  const padFilter = document.getElementById('padFilter');
  const wellFilter = document.getElementById('wellFilter');
  const toggleBtn = document.getElementById('toggleMode');
  const exportBtn = document.getElementById('exportBtn');

  const API_URL = 'https://script.google.com/macros/s/AKfycbxIxEEk8tkM6bMSVVdQL5XiWCTxGyk3tRqWgH1cLGKVeKI8rrpHG32w1NItRfagim9RsA/exec'; // <-- put your deployed Google Apps Script Web App URL here

  const fields = [
    'entry_date', 'pad', 'well', 'tub_press', 'cas_press', 'speed', 'fluid_level',
    'torque', 'oil_press', 'oil_level', 'frecuenze', 'tank_volume', 'free_water',
    'bsw_tank', 'tank_temp', 'water_diluent', 'diesel_propane', 'chmc'
  ];

  let entries = [];

  async function fetchEntries() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Failed to fetch entries');
      const data = await res.json();
      entries = data;
      renderTable();
    } catch (e) {
      console.error(e);
    }
  }

  async function addEntry(data) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add entry');
      return await res.json();
    } catch (e) {
      console.error(e);
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {};
    fields.forEach(id => data[id] = form[id]?.value || '');
    await addEntry(data);
    await fetchEntries();
    form.reset();
  });

  function renderTable() {
    tableBody.innerHTML = '';
    const dateVal = dateFilter.value;
    const padVal = padFilter.value;
    const wellVal = wellFilter.value;

    const filtered = entries.filter(e =>
      (!dateVal || e.entry_date === dateVal) &&
      (!padVal || e.pad === padVal) &&
      (!wellVal || e.well === wellVal)
    );

    // Fill filter dropdowns based on all entries
    const uniqueOptions = (key) => [...new Set(entries.map(e => e[key]).filter(Boolean))];

    dateFilter.innerHTML = '<option value="">All Dates</option>' +
      uniqueOptions('entry_date').map(v => `<option value="${v}">${v}</option>`).join('');

    padFilter.innerHTML = '<option value="">All PADs</option>' +
      uniqueOptions('pad').map(v => `<option value="${v}">${v}</option>`).join('');

    wellFilter.innerHTML = '<option value="">All Wells</option>' +
      uniqueOptions('well').map(v => `<option value="${v}">${v}</option>`).join('');

    filtered.forEach((entry, index) => {
      const row = document.createElement('tr');
      fields.forEach(key => {
        const cell = document.createElement('td');
        cell.textContent = entry[key];
        cell.contentEditable = true;
        cell.addEventListener('blur', () => {
          // Update entry on blur (optional: implement update API in Apps Script)
          entry[key] = cell.textContent.trim();
          // Note: To persist edits back to Google Sheets, you'd need an update API endpoint.
          // For now, edits only update UI.
        });
        row.appendChild(cell);
      });

      const actionCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.onclick = () => {
        alert('Deleting entries via Google Sheets API requires a backend script with delete logic.');
        // Optional: Implement delete logic in Apps Script for full CRUD
      };
      actionCell.appendChild(deleteBtn);
      row.appendChild(actionCell);
      tableBody.appendChild(row);
    });
  }

  toggleBtn?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });

  exportBtn?.addEventListener('click', () => {
    const headers = [...fields];
    let csv = headers.join(',') + '\n';
    entries.forEach(entry => {
      const values = fields.map(f => '"' + (entry[f] || '') + '"');
      csv += values.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'well_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  padSelect?.addEventListener('change', () => {
    const pad = padSelect.value;
    wellSelect.innerHTML = '<option value="">-- Select Well --</option>';
    if (pad) {
      for (let i = 1; i <= 5; i++) {
        const well = `${pad}_Well_${i}`;
        const option = new Option(well, well);
        wellSelect.appendChild(option);
      }
    }
  });

  [dateFilter, padFilter, wellFilter].forEach(select => select?.addEventListener('change', renderTable));

  // Load data initially
  fetchEntries();
});
