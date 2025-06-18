// — Your Supabase credentials —
const SUPABASE_URL = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';

// — Initialize the Supabase client —
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
  // 1️⃣ Get user’s email from splash screen
  const currentEmail = sessionStorage.getItem('userEmail') || 'unknown@example.com';

  // 2️⃣ DOM references
  const form       = document.getElementById('wellForm');
  const padSelect  = document.getElementById('pad');
  const wellSelect = document.getElementById('well');
  const table      = document.getElementById('previewTable');
  const thead      = table.querySelector('thead');
  const tableBody  = table.querySelector('tbody');
  const toggleBtn  = document.getElementById('toggleMode');

  // 3️⃣ Data fields
  const fields = [
    'entry_date','pad','well','tub_press','cas_press','speed','fluid_level',
    'torque','oil_press','oil_level','frecuenze','tank_volume','free_water',
    'bsw_tank','tank_temp','water_diluent','diesel_propane','chmc'
  ];

  // 4️⃣ Table & realtime channel
  const tableName   = 'north1_entries';
  const channelName = `public:${tableName}`;

  let entries = [];
  let filterValues = {};
  let sortKey = null, sortDir = 'asc';

  // 5️⃣ Build filter row & sorting on headers
  const headerRow = thead.querySelector('tr');
  // Attach sort events
  headerRow.querySelectorAll('th').forEach((th, idx) => {
    if (idx < fields.length) {
      const key = fields[idx];
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortKey = key; sortDir = 'asc'; }
        renderTable();
      });
    }
  });
  // Insert filter inputs
  const filterRow = document.createElement('tr');
  fields.forEach(key => {
    const th = document.createElement('th');
    const input = document.createElement('input');
    input.placeholder = 'Filter';
    input.dataset.key = key;
    input.style.width = '80%';
    input.addEventListener('input', () => {
      filterValues[key] = input.value;
      renderTable();
    });
    th.appendChild(input);
    filterRow.appendChild(th);
  });
  // empty th for action column
  filterRow.appendChild(document.createElement('th'));
  thead.appendChild(filterRow);

  // 6️⃣ Load existing rows
  async function loadEntries() {
    const { data, error } = await supabaseClient
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return console.error('Fetch error:', error);
    entries = data;
    renderTable();
  }

  // 7️⃣ Realtime subscription
  supabaseClient
    .channel(channelName)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: tableName }, ({ new: r }) => { entries.unshift(r); renderTable(); })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: tableName }, ({ new: r }) => {
      const i = entries.findIndex(e => e.id === r.id);
      if (i > -1) entries[i] = r;
      renderTable();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: tableName }, ({ old: r }) => {
      entries = entries.filter(e => e.id !== r.id);
      renderTable();
    })
    .subscribe();
  loadEntries();

  // 8️⃣ Form submit → INSERT
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = { user_email: currentEmail };
    fields.forEach(f => payload[f] = form.elements[f]?.value || null);

    const { data, error } = await supabaseClient
      .from(tableName)
      .insert([payload])
      .select();
    if (error) return alert(`Insert failed: ${error.message}`);
    entries.unshift(data[0]); renderTable(); form.reset();
  });

  // 9️⃣ Render + filter + sort + totals
  function renderTable() {
    tableBody.innerHTML = '';
    let data = [...entries];
    // apply filtering
    data = data.filter(e => fields.every(k => {
      const f = filterValues[k] || '';
      if (!f) return true;
      return (e[k] ?? '').toString().toLowerCase().includes(f.toLowerCase());
    }));
    // apply sorting
    if (sortKey) {
      data.sort((a,b) => {
        let av = a[sortKey], bv = b[sortKey];
        const na = parseFloat(av), nb = parseFloat(bv);
        if (!isNaN(na) && !isNaN(nb)) { av = na; bv = nb; }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    // draw rows
    data.forEach(entry => {
      const tr = document.createElement('tr');
      fields.forEach(key => {
        const td = document.createElement('td');
        td.textContent = entry[key] ?? '';
        td.contentEditable = entry.user_email === currentEmail;
        td.addEventListener('blur', async () => {
          const nv = td.textContent.trim() || null;
          if (nv === entry[key]) return;
          const { error } = await supabaseClient.from(tableName)
            .update({ [key]: nv }).eq('id', entry.id);
          if (error) return alert(`Update failed: ${error.message}`);
          entry[key] = nv; renderTable();
        });
        tr.appendChild(td);
      });
      // action cell
      const act = document.createElement('td');
      if (entry.user_email === currentEmail) {
        const btn = document.createElement('button'); btn.textContent = 'Delete';
        btn.addEventListener('click', async () => {
          const { error } = await supabaseClient.from(tableName)
            .delete().eq('id', entry.id);
          if (error) return alert(`Delete failed: ${error.message}`);
          entries = entries.filter(e => e.id !== entry.id);
          renderTable();
        });
        act.appendChild(btn);
      }
      tr.appendChild(act);
      tableBody.appendChild(tr);
    });
    // totals row
    const totals = {};
    fields.forEach(k => totals[k] = 0);
    data.forEach(e => fields.forEach(k => {
      const v = parseFloat(e[k]); if (!isNaN(v)) totals[k] += v;
    }));
    const trTot = document.createElement('tr'); trTot.classList.add('total-row');
    fields.forEach((k,i) => {
      const td = document.createElement('td');
      td.textContent = i === 0 ? 'Total' : (totals[k] ? totals[k].toFixed(2) : '');
      trTot.appendChild(td);
    });
    trTot.appendChild(document.createElement('td')); // action column
    tableBody.appendChild(trTot);
  }

  // 🔟 Dark-mode toggle
  toggleBtn?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });
});
