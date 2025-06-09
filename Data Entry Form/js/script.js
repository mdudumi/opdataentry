document.addEventListener("DOMContentLoaded", () => {
  const API_URL =
    "https://script.google.com/macros/s/AKfycbxBEm--xTVpAetlFYGbgQP88yhk5HFFMViAG3RdIyZj8ZGj2xBMSl1EdnZu94nYfxOvqw/exec";

  const fields = [
    "entry_date",
    "pad",
    "well",
    "tub_press",
    "cas_press",
    "speed",
    "fluid_level",
    "torque",
    "oil_press",
    "oil_level",
    "frecuenze",
    "tank_volume",
    "free_water",
    "bsw_tank",
    "tank_temp",
    "water_diluent",
    "diesel_propane",
    "chmc",
  ];

  const form = document.getElementById("wellForm");
  const tableBody = document.querySelector("#previewTable tbody");
  const dateFilter = document.getElementById("dateFilter");
  const padFilter = document.getElementById("padFilter");
  const wellFilter = document.getElementById("wellFilter");
  const exportBtn = document.getElementById("exportBtn");

  let entries = [];

  // Utility: get unique values with optional filter function
  function uniqueValues(key, filterFn = () => true) {
    return [...new Set(entries.filter(filterFn).map(e => e[key]).filter(Boolean))];
  }

  // Populate date filter options
  function populateDateFilter() {
    const currentValue = dateFilter.value;
    const options = ['<option value="">All Dates</option>']
      .concat(uniqueValues('entry_date').map(val => `<option value="${val}">${val}</option>`));
    dateFilter.innerHTML = options.join('');
    if (uniqueValues('entry_date').includes(currentValue)) {
      dateFilter.value = currentValue;
    } else {
      dateFilter.value = '';
    }
  }

  // Populate pad filter options
  function populatePadFilter() {
    const currentValue = padFilter.value;
    const options = ['<option value="">All Pads</option>']
      .concat(uniqueValues('pad').map(val => `<option value="${val}">${val}</option>`));
    padFilter.innerHTML = options.join('');
    if (uniqueValues('pad').includes(currentValue)) {
      padFilter.value = currentValue;
    } else {
      padFilter.value = '';
    }
  }

  // Populate well filter options, depending on selected pad
  function populateWellFilter() {
    const selectedPad = padFilter.value;
    const currentValue = wellFilter.value;
    const wells = selectedPad
      ? uniqueValues('well', e => e.pad === selectedPad)
      : uniqueValues('well');
    const options = ['<option value="">All Wells</option>']
      .concat(wells.map(val => `<option value="${val}">${val}</option>`));
    wellFilter.innerHTML = options.join('');
    if (wells.includes(currentValue)) {
      wellFilter.value = currentValue;
    } else {
      wellFilter.value = '';
    }
  }

  // Update all filters together (called after fetching or pad changes)
  function updateFilters() {
    populateDateFilter();
    populatePadFilter();
    populateWellFilter();
  }

  // Fetch data from API
  async function fetchEntries() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Failed to fetch entries");
      const data = await res.json();
      entries = data;
      updateFilters();
      renderTable();
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  // Render the table with current filters
  function renderTable() {
    tableBody.innerHTML = "";
    const dateVal = dateFilter.value;
    const padVal = padFilter.value;
    const wellVal = wellFilter.value;

    const filteredEntries = entries.filter(entry =>
      (!dateVal || entry.entry_date === dateVal) &&
      (!padVal || entry.pad === padVal) &&
      (!wellVal || entry.well === wellVal)
    );

    filteredEntries.forEach(entry => {
      const row = document.createElement("tr");
      fields.forEach(field => {
        const cell = document.createElement("td");
        cell.textContent = entry[field] || "";
        row.appendChild(cell);
      });
      tableBody.appendChild(row);
    });
  }

  // Add new entry to API
  async function addEntry(data) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add entry");
      await fetchEntries();
      form.reset();
    } catch (error) {
      console.error("Error adding entry:", error);
    }
  }

  // Event Listeners
  form.addEventListener("submit", e => {
    e.preventDefault();
    const data = {};
    fields.forEach(field => {
      const input = form[field];
      if (input) data[field] = input.value;
    });
    addEntry(data);
  });

  dateFilter.addEventListener("change", () => {
    renderTable();
  });

  padFilter.addEventListener("change", () => {
    populateWellFilter(); // Update wells when pad changes
    renderTable();
  });

  wellFilter.addEventListener("change", () => {
    renderTable();
  });

  exportBtn.addEventListener("click", () => {
    const csvContent =
      fields.join(",") +
      "\n" +
      entries
        .map(entry => fields.map(field => entry[field] || "").join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "well_data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Initial fetch
  fetchEntries();
});
