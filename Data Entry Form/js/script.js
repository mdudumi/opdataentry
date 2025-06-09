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

  let entries = JSON.parse(localStorage.getItem('wellEntries') || '[]');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {};
    fields.forEach(id => data[id] = form[id]?.value || '');
    entries.push(data);
    localStorage.setItem('wellEntries', JSON.stringify(entries));
    renderTable();
    form.reset();
    wellSelect.innerHTML = '<option value="">-- Select Well --</option>'; // reset wells
  });

  padSelect?.addEventListener('change', () => {
    const pad = padSelect.value;
    wellSelect.innerHTML = '<option value="">-- Select Well --</option>';
    if (pad) {
      for (let i = 1; i <= 5; i++) {
        const well = `${pad}_Well_${i}`;
        wellSelect.appendChild(new Option(well, well));
      }
    }
  });

  function renderTable() {
    // Preserve filter values
    const dateVal = dateFilter.value;
    const padVal = padFilter.value;
    const wellVal = wellFilter.value;

    const filtered = entries.filter(e =>
      (!dateVal || e.entry_date === dateVal) &&
      (!padVal || e.pad === padVal) &&
      (!wellVal || e.well === wellVal)
    );

    const uniqueOptions = (key) => [...new Set(entries.map(e => e[key]).filter(Boolean))];

    function updateFilter(select, key, label, selectedVal) {
      select.innerHTML = `<option value="">${label}</option>` +
        uniqueOptions(key).map(v => `<option value="${v}">${v}</option>`).join('');
      select.value = selectedVal;
    }

    updateFilter(dateFilter, 'entry_date', 'All Dates', dateVal);
    updateFilter(padFilter, 'pad', 'All PADs', padVal);
    updateFilter(wellFilter, 'well', 'All Wells', wellVal);

    tableBody.innerHTML = '';
    filtered.forEach((entry, index) => {
      const row = document.createElement('tr');
      fields.forEach(key => {
        const cell = document.createElement('td');
        cell.textContent = entry[key];
        cell.contentEditable = true;
        cell.addEventListener('blur', () => {
          entries[index][key] = cell.textContent.trim();
          localStorage.setItem('wellEntries', JSON.stringify(entries));
        });
        row.appendChild(cell);
      });

      const actionCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.onclick = () => {
        entries.splice(index, 1);
        localStorage.setItem('wellEntries', JSON.stringify(entries));
        renderTable();
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

  // Re-render table on filter changes
  [dateFilter, padFilter, wellFilter].forEach(select => {
    select?.addEventListener('change', renderTable);
  });

  renderTable();
});
