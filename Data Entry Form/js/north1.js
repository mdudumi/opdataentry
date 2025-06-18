// — Your Supabase credentials —
const SUPABASE_URL = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';

// — Initialize the Supabase client —
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
  // — User info —
  const currentEmail = sessionStorage.getItem('userEmail') || 'unknown@example.com';

  // — DOM nodes —
  const form       = document.getElementById('wellForm');
  const padSelect  = document.getElementById('pad');
  const wellSelect = document.getElementById('well');
  const table      = document.getElementById('previewTable');
  const thead      = table.querySelector('thead');
  const tbody      = table.querySelector('tbody');
  const toggleBtn  = document.getElementById('toggleMode');

  // — Fields list —
  const fields = [
    'entry_date','pad','well','tub_press','cas_press','speed','fluid_level',
    'torque','oil_press','oil_level','frecuenze','tank_volume','free_water',
    'bsw_tank','tank_temp','water_diluent','diesel_propane','chmc'
  ];

  const tableName = 'north1_entries';
  let entries = [];
  let filterValues = {};
  let sortKey = null;
  let sortDir = 'asc';

  // — Build header with filters —
  function buildHeader() {
    thead.innerHTML = '';
    // 1) Title row
    const titleRow = document.createElement('tr');
    fields.forEach(key => {
      const th = document.createElement('th');
      th.textContent = key.replace('_',' ').toUpperCase();
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortKey = key; sortDir = 'asc'; }
        renderTable();
      });
      titleRow.appendChild(th);
    });
    titleRow.appendChild(document.createElement('th')); // action column
    // 2) Filter row
    const filterRow = document.createElement('tr');
    fields.forEach(key => {
      const th = document.createElement('th');
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Filter';
      input.dataset.key = key;
      input.addEventListener('input', () => {
        filterValues[key] = input.value.trim().toLowerCase();
        renderTable();
      });
      th.appendChild(input);
      filterRow.appendChild(th);
    });
    filterRow.appendChild(document.createElement('th'));
    thead.appendChild(titleRow);
    thead.appendChild(filterRow);
  }

  // — Load and subscribe —
  async function loadEntries() {
    const { data, error } = await supabaseClient
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return console.error(error);
    entries = data;
    renderTable();
  }
  buildHeader();

  supabaseClient
    .channel(`public:${tableName}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, payload => {
      if (payload.eventType === 'INSERT') entries.unshift(payload.new);
      if (payload.eventType === 'UPDATE') {
        const i = entries.findIndex(e => e.id === payload.new.id);
        if (i > -1) entries[i] = payload.new;
      }
      if (payload.eventType === 'DELETE') {
        entries = entries.filter(e => e.id !== payload.old.id);
      }
      renderTable();
    })
    .subscribe();

  loadEntries();

  // — Form submit —
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = { user_email: currentEmail };
    fields.forEach(f => payload[f] = form.elements[f]?.value || null);
    const { data, error } = await supabaseClient
      .from(tableName)
      .insert([payload])
      .select();
    if (error) return alert(error.message);
    entries.unshift(data[0]);
    renderTable();
    form.reset();
  });

  // — Render —
  function renderTable() {
    tbody.innerHTML = '';
    let data = [...entries];
    // apply filters
    data = data.filter(row => fields.every(k => {
      const f = filterValues[k] || '';
      return !f || (row[k] ?? '').toString().toLowerCase().includes(f);
    }));
    // apply sort
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
    // rows
    data.forEach(entry => {
      const tr = document.createElement('tr');
      fields.forEach(key => {
        const td = document.createElement('td');
        td.textContent = entry[key] ?? '';
        td.contentEditable = entry.user_email === currentEmail;
        td.addEventListener('blur', async () => {
          const nv = td.textContent.trim() || null;
          if (nv === entry[key]) return;
          await supabaseClient.from(tableName).update({ [key]: nv }).eq('id', entry.id);
        });
        tr.appendChild(td);
      });
      const act = document.createElement('td');
      if (entry.user_email === currentEmail) {
        const btn = document.createElement('button'); btn.textContent = 'Delete';
        btn.addEventListener('click', async () => {
          await supabaseClient.from(tableName).delete().eq('id', entry.id);
        });
        act.appendChild(btn);
      }
      tr.appendChild(act);
      tbody.appendChild(tr);
    });
    // totals row
    const tot = {};
    fields.forEach(k => tot[k] = 0);
    data.forEach(r => fields.forEach(k => {
      const v = parseFloat(r[k]); if (!isNaN(v)) tot[k] += v;
    }));
    const trT = document.createElement('tr'); trT.className='total-row';
    fields.forEach((k,i) => {
      const td = document.createElement('td');
      td.textContent = i===0 ? 'Total' : (tot[k]? tot[k].toFixed(2): '');
      trT.appendChild(td);
    });
    trT.appendChild(document.createElement('td'));
    tbody.appendChild(trT);
  }

  // — Dark mode —
  toggleBtn?.addEventListener('click', () => document.body.classList.toggle('dark-mode'));
});

