function renderTable() {
  // Save current filter values before refreshing options
  const dateVal = dateFilter.value;
  const padVal = padFilter.value;
  const wellVal = wellFilter.value;

  // Filter entries
  const filtered = entries.filter(e =>
    (!dateVal || e.entry_date === dateVal) &&
    (!padVal || e.pad === padVal) &&
    (!wellVal || e.well === wellVal)
  );

  // Get unique values for dropdowns
  const uniqueOptions = (key) => [...new Set(entries.map(e => e[key]).filter(Boolean))];

  // Helper to update a filter dropdown and preserve its current selection
  function updateFilter(select, key, label, selectedVal) {
    select.innerHTML = `<option value="">${label}</option>` +
      uniqueOptions(key).map(v => `<option value="${v}">${v}</option>`).join('');
    select.value = selectedVal;
  }

  updateFilter(dateFilter, 'entry_date', 'All Dates', dateVal);
  updateFilter(padFilter, 'pad', 'All PADs', padVal);
  updateFilter(wellFilter, 'well', 'All Wells', wellVal);

  // Clear table and render filtered entries
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

    // Add delete button
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
