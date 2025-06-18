// — Your Supabase credentials —
const SUPABASE_URL = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';

// — Initialize the Supabase client —
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ——————————————————————————
// 2. State & DOM references
// ——————————————————————————
let entries = [];

const form        = document.getElementById('wellForm');
const tableBody   = document.querySelector('#previewTable tbody');
const padSelect   = document.getElementById('pad');
const wellSelect  = document.getElementById('well');
const toggleBtn   = document.getElementById('toggleMode');

const xSelect     = document.getElementById('xParam');
const ySelect     = document.getElementById('yParam');
const plotBtn     = document.getElementById('renderChart');
const ctx         = document.getElementById('parameterChart').getContext('2d');
let chart;  // Chart.js instance

// Ordered list of fields for table & selects
const numericFields = [
  'tub_press','cas_press','speed','fluid_level','torque',
  'oil_press','oil_level','frecuenze','tank_volume',
  'free_water','bsw_tank','tank_temp','water_diluent',
  'diesel_propane','chmc'
];
const allFields = ['entry_date','pad','well', ...numericFields];

// ——————————————————————————
// 3. Load & render entries
// ——————————————————————————
async function loadEntries() {
  const { data, error } = await supabase
    .from('well_entries')
    .select('*')
    .order('entry_date', { ascending: true });

  if (error) {
    console.error('Error loading entries:', error);
    return;
  }
  entries = data;
  renderTable();
  populateChartSelectors();
}

function renderTable() {
  tableBody.innerHTML = '';
  entries.forEach(entry => {
    const tr = document.createElement('tr');

    allFields.forEach(key => {
      const td = document.createElement('td');
      td.textContent = entry[key] ?? '';
      tr.appendChild(td);
    });

    // Action cell (delete)
    const actionTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      await supabase
        .from('well_entries')
        .delete()
        .eq('id', entry.id);
      await loadEntries();
    });
    actionTd.appendChild(delBtn);
    tr.appendChild(actionTd);

    tableBody.appendChild(tr);
  });
}

// ——————————————————————————
// 4. Form submission (insert)
// ——————————————————————————
form.addEventListener('submit', async e => {
  e.preventDefault();

  // build payload
  const payload = {
    entry_date: form.entry_date.value,
    pad:        form.pad.value,
    well:       form.well.value,
  };
  numericFields.forEach(f => {
    const val = form[f].value;
    payload[f] = val === '' ? null : parseFloat(val);
  });

  const { error } = await supabase
    .from('well_entries')
    .insert([payload]);

  if (error) {
    console.error('Insert error:', error);
  } else {
    form.reset();
    await loadEntries();
  }
});

// ——————————————————————————
// 5. Pad → Well dynamic dropdown
// ——————————————————————————
padSelect.addEventListener('change', () => {
  const pad = padSelect.value;
  wellSelect.innerHTML = '<option value="">-- Select Well --</option>';
  if (pad) {
    for (let i = 1; i <= 5; i++) {
      wellSelect.add(new Option(`${pad}_Well_${i}`, `${pad}_Well_${i}`));
    }
  }
});

// ——————————————————————————
// 6. Dark‐mode toggle
// ——————————————————————————
toggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});

// ——————————————————————————
// 7. Chart.js rendering
// ——————————————————————————
function populateChartSelectors() {
  // populate X selector with all fields
  xSelect.innerHTML = allFields
    .map(f => `<option value="${f}">${f.replace(/_/g,' ').toUpperCase()}</option>`)
    .join('');

  // populate Y selector with only numeric fields
  ySelect.innerHTML = numericFields
    .map(f => `<option value="${f}">${f.replace(/_/g,' ').toUpperCase()}</option>`)
    .join('');
}

plotBtn.addEventListener('click', () => {
  const xKey = xSelect.value;
  const yKey = ySelect.value;

  const labels = entries.map(e => e[xKey]);
  const data   = entries.map(e => parseFloat(e[yKey]) || 0);

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${ySelect.selectedOptions[0].text} vs ${xSelect.selectedOptions[0].text}`,
        data,
        fill: false,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: xSelect.selectedOptions[0].text }
        },
        y: {
          title: { display: true, text: ySelect.selectedOptions[0].text }
        }
      }
    }
  });
});

// ——————————————————————————
// 8. Initialize on page load
// ——————————————————————————
document.addEventListener('DOMContentLoaded', () => {
  loadEntries();
});
