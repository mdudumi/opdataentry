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

  const fields = [
    'entry_date', 'pad', 'well', 'tub_press', 'cas_press', 'speed', 'fluid_level',
    'torque', 'oil_press', 'oil_level', 'frecuenze', 'tank_volume', 'free_water',
    'bsw_tank', 'tank_temp', 'water_diluent', 'diesel_propane', 'chmc'
  ];

  const apiUrl = 'YOUR_APPS_SCRIPT_URL'; // Replace with your Apps Script URL

  // Fetch data from Google Sheets
  async function fetchSheetData() {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('Failed to fetch data.');
    return response.json();
  }

  // Append data to Google Sheets
  async function appendRowToSheet(data) {
    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'append', data }),
    });
  }

  // Delete data from Google Sheets
  async function deleteRowFromSheet(rowIndex) {
    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', row: rowIndex }),
    });
  }

  // Render the table with data from Google Sheets
  async function renderTable() {
    const entries = await fetchSheetData();
    tableBody.innerHTML = '';

    const dateVal = dateFilter.value;
    const padVal = padFilter.value;
    const wellVal = wellFilter.value;

    const filtered = entries.filter(e =>
      (!dateVal || e[0] === dateVal) &&
      (!padVal || e[1] === padVal) &&
      (!wellVal || e[2] === wellVal)
    );

    const uniqueOptions = (index) => [...new Set(entries.map(e => e[index]).filter(Boolean))];

    dateFilter.innerHTML = '<option value="">All Dates</option>' +
      uniqueOptions(0).map(v => `<option value="${v}">${v}</option>`).join('');

    padFilter.innerHTML = '<option value="">All PADs</option>' +
      uniqueOptions(1).map(v => `<option value="${v}">${v}</option>`).join('');

    wellFilter.innerHTML = '<option value="">All Wells</option>' +
      uniqueOptions(2).map(v => `<option value="${v}">${v}</option>`).join('');

    filtered.forEach((entry, index) => {
      const row = document.createElement('tr');
      entry.forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      const actionCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.onclick = async () => {
        await deleteRowFromSheet(index);
        renderTable();
      };
      actionCell.appendChild(deleteBtn);
      row.appendChild(actionCell);
      tableBody.appendChild(row);
    });
  }

  // Submit the form and add data to Google Sheets
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = fields.map(id => form[id]?.value || '');
    await appendRowToSheet(data);
    form.reset();
    renderTable();
  });

  // Toggle dark mode
  toggleBtn?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });

  // Export table data to CSV (only front-end export)
  exportBtn?.addEventListener('click', async () => {
    const entries = await fetchSheetData();
    const headers = fields;
    let csv = headers.join(',') + '\n';
    entries.forEach(entry => {
      csv += entry.join(',') + '\n';
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

  // Pad and well dropdown linkage
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

  // Apply filters and update the table
  [dateFilter, padFilter, wellFilter].forEach(select => select?.addEventListener('change', renderTable));

  // Initial table render
  renderTable();
});
