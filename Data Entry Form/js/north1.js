// — Your Supabase credentials —
const SUPABASE_URL = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';

// — Initialize the Supabase client —
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
document.addEventListener('DOMContentLoaded', () => {
  const currentEmail = sessionStorage.getItem('userEmail') || 'unknown@example.com';
  const form       = document.getElementById('wellForm');
  const padSelect  = document.getElementById('pad');
  const wellSelect = document.getElementById('well');
  const table      = document.getElementById('previewTable');
  const thead      = table.querySelector('thead');
  const tbody      = table.querySelector('tbody');
  const toggleBtn  = document.getElementById('toggleMode');

  const fields = ['entry_date','pad','well','tub_press','cas_press','speed','fluid_level','torque','oil_press','oil_level','frecuenze','tank_volume','free_water','bsw_tank','tank_temp','water_diluent','diesel_propane','chmc'];
  const tableName = 'north1_entries';
  let entries = [];
  let filterValues = {};
  let sortKey = null, sortDir = 'asc';

  function buildHeader() {
    thead.innerHTML = '';
    const headerRow = document.createElement('tr');
    fields.forEach(key => {
      const th = document.createElement('th');
      th.textContent = key.replace(/_/g,' ').toUpperCase();
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc'; else { sortKey = key; sortDir = 'asc'; }
        renderTable();
      });
      headerRow.appendChild(th);
    });
    headerRow.appendChild(document.createElement('th'));
    thead.appendChild(headerRow);

    const filterRow = document.createElement('tr');
    fields.forEach(key => {
      const th = document.createElement('th');
      const op = document.createElement('select');
      ['', '=', 'contains', '<', '<=', '>', '>=', 'between'].forEach(o => {
        const opt = document.createElement('option'); opt.value = o; opt.textContent = o || 'Op'; op.appendChild(opt);
      });
      op.style.width = '60px';
      op.addEventListener('change', () => {
        filterValues[key] = filterValues[key] || {};
        filterValues[key].op = op.value;
        renderTable();
      });
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.placeholder = 'Value';
      inp.style.width = 'calc(100% - 65px)';
      inp.style.marginLeft = '5px';
      inp.addEventListener('input', () => {
        filterValues[key] = filterValues[key] || {};
        filterValues[key].val = inp.value;
        renderTable();
      });
      th.appendChild(op);
      th.appendChild(inp);
      filterRow.appendChild(th);
    });
    filterRow.appendChild(document.createElement('th'));
    thead.appendChild(filterRow);
  }

  async function loadEntries() {
    const { data, error } = await supabaseClient.from(tableName)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return console.error(error);
    entries = data;
    renderTable();
  }

  supabaseClient
    .channel(`public:${tableName}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, payload => {
      if (payload.eventType === 'INSERT') entries.unshift(payload.new);
      if (payload.eventType === 'UPDATE') {
        const i = entries.findIndex(e => e.id === payload.new.id);
        if (i > -1) entries[i] = payload.new;
      }
      if (payload.eventType === 'DELETE') entries = entries.filter(e => e.id !== payload.old.id);
      renderTable();
    })
    .subscribe();

  buildHeader();
  loadEntries();

  padSelect.addEventListener('change', () => {
    wellSelect.innerHTML = '<option value="">-- Select Well --</option>';
    if (!padSelect.value) return;
    for (let i = 1; i <= 5; i++) {
      wellSelect.appendChild(new Option(`${padSelect.value}_Well_${i}`, `${padSelect.value}_Well_${i}`));
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = { user_email: currentEmail };
    fields.forEach(f => payload[f] = form.elements[f]?.value || null);
    const { data, error } = await supabaseClient.from(tableName)
      .insert([payload])
      .select();
    if (error) return alert(error.message);
    entries.unshift(data[0]);
    renderTable();
    form.reset();
  });

  function renderTable() {
    tbody.innerHTML = '';
    let data = [...entries];
    data = data.filter(row => fields.every(key => {
      const fv = filterValues[key] || {};
      const op = fv.op;
      const val = fv.val;
      if (!op || !val) return true;
      const cell = (row[key] ?? '').toString();
      const lc = cell.toLowerCase();
      const v = val.toLowerCase();
      switch (op) {
        case '=': return lc === v;
        case 'contains': return lc.includes(v);
        case '<': return parseFloat(cell) < parseFloat(val);
        case '<=': return parseFloat(cell) <= parseFloat(val);
        case '>': return parseFloat(cell) > parseFloat(val);
        case '>=': return parseFloat(cell) >= parseFloat(val);
        case 'between': {
          const parts = val.split(',').map(x => parseFloat(x.trim()));
          const num = parseFloat(cell);
          return parts.length === 2 && num >= parts[0] && num <= parts[1];
        }
        default: return true;
      }
    }));
    if (sortKey) {
      data.sort((a, b) => {
        let av = a[sortKey], bv = b[sortKey];
        const na = parseFloat(av), nb = parseFloat(bv);
        if (!isNaN(na) && !isNaN(nb)) { av = na; bv = nb; }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
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
          entry[key] = nv;
        });
        tr.appendChild(td);
      });
      const ac = document.createElement('td');
      if (entry.user_email === currentEmail) {
        const btn = document.createElement('button'); btn.textContent = 'Delete';
        btn.addEventListener('click', async () => {
          await supabaseClient.from(tableName).delete().eq('id', entry.id);
        });
        ac.appendChild(btn);
      }
      tr.appendChild(ac);
      tbody.appendChild(tr);
    });
    const totals = {};
    fields.forEach(k => totals[k] = 0);
    data.forEach(r => fields.forEach(k => {
      const n = parseFloat(r[k]);
      if (!isNaN(n)) totals[k] += n;
    }));
    const trT = document.createElement('tr');
    trT.className = 'total-row';
    trT.style.backgroundColor = '#d0eaff';
    trT.style.color = '#000';
    trT.style.fontWeight = 'bold';
    fields.forEach((k, i) => {
      const td = document.createElement('td');
      td.textContent = i === 0 ? 'Total' : (totals[k] ? totals[k].toFixed(2) : '');
      trT.appendChild(td);
    });
    trT.appendChild(document.createElement('td'));
    tbody.appendChild(trT);
  }

  toggleBtn?.addEventListener('click', () => document.body.classList.toggle('dark-mode'));
});
