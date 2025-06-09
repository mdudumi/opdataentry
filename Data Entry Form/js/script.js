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

  // Fetch data from API
  async function fetchEntries() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Failed to fetch entries");
      const data = await res.json();
      entries = data;
      renderTable();
      updateFilters(padFilter.value); // Update filters after fetch, considering current pad filter
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  // Add a new entry
  async function addEntry(data) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add entry");
      await fetchEntries(); // Refresh entries after adding
      form.reset();
    } catch (error) {
      console.error("Error adding entry:", error);
    }
  }

  // Render the table
  function renderTable() {
    tableBody.innerHTML = "";
    const dateVal = dateFilter.value;
    const padVal = padFilter.value;
    const wellVal = wellFilter.value;

    const filteredEntries = entries.filter((entry) =>
      (!dateVal || entry.entry_date === dateVal) &&
      (!padVal || entry.pad === padVal) &&
      (!wellVal || entry.well === wellVal)
    );

    filteredEntries.forEach((entry) => {
      const row = document.createElement("tr");
      fields.forEach((field) => {
        const cell = document.createElement("td");
        cell.textContent = entry[field] || "";
        row.appendChild(cell);
      });
      tableBody.appendChild(row);
    });
  }

  // Populate dropdown filters dynamically, with well filter dependent on selected pad
  function updateFilters(selectedPad = "") {
    const uniqueOptions = (key, filterFn = () => true) =>
      [...new Set(entries.filter(filterFn).map((e) => e[key]).filter(Boolean))];

    // Date filter unchanged
    dateFilter.innerHTML =
      '<option value="">All Dates</option>' +
      uniqueOptions("entry_date")
        .map((value) => `<option value="${value}">${value}</option>`)
        .join("");

    // Pad filter unchanged
    padFilter.innerHTML =
      '<option value="">All Pads</option>' +
      uniqueOptions("pad")
        .map((value) => `<option value="${value}">${value}</option>`)
        .join("");

    // Set padFilter value again to keep current selection (important after resetting options)
    if (selectedPad) {
      padFilter.value = selectedPad;
    } else {
      padFilter.value = "";
    }

    // Well filter depends on selectedPad
    const wellFilterOptions = selectedPad
      ? uniqueOptions("well", (e) => e.pad === selectedPad)
      : uniqueOptions("well");

    wellFilter.innerHTML =
      '<option value="">All Wells</option>' +
      wellFilterOptions
        .map((value) => `<option value="${value}">${value}</option>`)
        .join("");

    // If current wellFilter value is no longer valid (filtered out), reset it
    if (!wellFilterOptions.includes(wellFilter.value)) {
      wellFilter.value = "";
    }
  }

  // Handle form submission
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {};
    fields.forEach((field) => {
      const input = form[field];
      if (input) data[field] = input.value;
    });
    addEntry(data);
  });

  // Handle export to CSV
  exportBtn.addEventListener("click", () => {
    const csvContent =
      fields.join(",") +
      "\n" +
      entries
        .map((entry) => fields.map((field) => entry[field] || "").join(","))
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

  // Filter events
  dateFilter.addEventListener("change", () => renderTable());

  padFilter.addEventListener("change", () => {
    updateFilters(padFilter.value);
    renderTable();
  });

  wellFilter.addEventListener("change", () => renderTable());

  // Initial fetch
  fetchEntries();
});
