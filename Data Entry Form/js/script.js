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
    if (!response.ok) throw new Error('Failed to fetch data from Google Sheets.');
    return response.json();
  }

  // Append a row to Google Sheets
  async function appendRowToSheet(row) {
    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'append', row }),
    });
  }

  // Update a row in Google Sheets
  async function updateRowInSheet(rowIndex, row) {
    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', rowIndex, row }),
    });
  }

  // Delete a row in Google Sheets
  async function deleteRowFromSheet(rowIndex) {
    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', rowIndex }),
    });
  }

  // Render the table
  async function renderTable() {
    const entries = await fetchSheetData();
    tableBody.innerHTML = '';

    entries.forEach((entry, rowIndex) => {
      const row = document.createElement('tr');
      entry.forEach((value, colIndex) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        cell.contentEditable = true;
        cell.addEventListener('blur', () => {
          const updatedRow = [...row.children].map(td => td.textContent);
          updateRowInSheet(rowIndex, updatedRow);
        });
        row.appendChild(cell);
      });

      // Add delete button
      const actionCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.onclick = async () => {
        await deleteRowFromSheet(rowIndex);
        renderTable();
      };
      actionCell.appendChild(deleteBtn);
      row.appendChild(actionCell);

      tableBody.appendChild(row);
    });
  }

  // Handle form submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = fields.map(id => form[id]?.value || '');
    await appendRowToSheet(data);
    form.reset();
    renderTable();
  });

  // Initial table render
  renderTable();
});
