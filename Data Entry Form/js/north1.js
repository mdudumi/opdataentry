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

  const fields = [
    'entry_date','pad','well','tub_press','cas_press','speed','fluid_level',
    'torque','oil_press','oil_level','frecuenze','tank_volume','free_water',
    'bsw_tank','tank_temp','water_diluent','diesel_propane','chmc'
  ];
  const tableName = 'north1_entries';
  let entries = [];
  let filterValues = {};   // { key: { op, val } }
  let sortKey = null;
  let sortDir = 'asc';

  // Build the three header rows: titles, operators, values
  function buildHeader() {
    thead.innerHTML = '';

    // 1️⃣ Titles with sort
    const titleRow = document.createElement('tr');
    fields.forEach(key => {
      const th = document.createElement('th');
      th.textContent = key.replace(/_/g,' ').toUpperCase();
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortKey = key; sortDir = 'asc'; }
        renderTable();
      });
      titleRow.appendChild(th);
    });
    titleRow.appendChild(document.createElement('th')); // action col
    thead.appendChild(titleRow);

    // 2️⃣ Operator row
    const opRow = document.createElement('tr');
    fields.forEach(key => {
      const th = document.createElement('th');
      const select = document.createElement('select');
      ['', '=', 'contains', '<', '<=', '>', '>=', 'between'].forEach(o => {
        const opt = document.createElement('option');
        opt.value = o;
        opt.textContent = o || 'Op';
        select.appendChild(opt);
      });
      select.addEventListener('change', () => {
        filterValues[key] = filterValues[key] || {};
        filterValues[key].op = select.value;
        renderTable();
      });
      th.appendChild(select);
      opRow.appendChild(th);
    });
    opRow.appendChild(document.createElement('th'));
    thead.appendChild(opRow);

    // 3️⃣ Value row
    const valRow = document.createElement('tr');
    fields.forEach(key => {
      const th = document.createElement('th');
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Value';
      input.addEventListener('input', () => {
        filterValues[key] = filterValues[key] || {};
        filterValues[key].val = input.value;
        renderTable();
      });
      th.appendChild(input);
      valRow.appendChild(th);
    });
    valRow.appendChild(document.createElement('th'));
    thead.appendChild(valRow);
  }

  // Load initial entries
  async function loadEntries() {
    const { data, error } = await supabaseClient
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return console.error('Fetch error:', error);
    entries = data;
    renderTable();
  }

  // Real-time subscription
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

  // Pad → Well cascade
  padSelect.addEventListener('change', () => {
    wellSelect.innerHTML = '<option value="">-- Select Well --</option>';
    if (!padSelect.value) return;
    for (let i = 1; i <= 5; i++) {
      wellSelect.appendChild(new Option(
        `${padSelect.value}_Well_${i}`,
        `${padSelect.value}_Well_${i}`
      ));
    }
  });

  // Handle new-entry form
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = { user_email: currentEmail };
    fields.forEach(f => {
      payload[f] = form.elements[f]?.value || null;
    });
    const { data, error } = await supabaseClient
      .from(tableName)
      .insert([payload])
      .select();
    if (error) {
      alert(`Insert failed: ${error.message}`);
      return;
    }
    entries.unshift(data[0]);
    renderTable();
    form.reset();
  });

  // Render table: apply filters, sort, then draw rows + totals
  function renderTable() {
    tbody.innerHTML = '';
    let data = [...entries];

    // 1) filtering
    data = data.filter(row => {
      return fields.every(key => {
        const fv = filterValues[key] || {};
        const op = fv.op, val = fv.val;
        if (!op || !val) return true;
        const cell = (row[key] ?? '').toString();
        const lc = cell.toLowerCase(), v = val.toLowerCase();
        switch (op) {
          case '=': return lc === v;
          case 'contains': return lc.includes(v);
          case '<': return parseFloat(cell) < parseFloat(val);
          case '<=': return parseFloat(cell) <= parseFloat(val);
          case '>': return parseFloat(cell) > parseFloat(val);
          case '>=': return parseFloat(cell) >= parseFloat(val);
          case 'between': {
            const parts = val.split(',').map(x => parseFloat(x.trim()));
            const n = parseFloat(cell);
            return parts.length === 2 && n >= parts[0] && n <= parts[1];
          }
          default: return true;
        }
      });
    });

    // 2) sorting
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

    // 3) rows
    data.forEach(entry => {
      const tr = document.createElement('tr');
      fields.forEach(key => {
        const td = document.createElement('td');
        td.textContent = entry[key] ?? '';
        td.contentEditable = entry.user_email === currentEmail;
        td.addEventListener('blur', async () => {
          const nv = td.textContent.trim() || null;
          if (nv === entry[key]) return;
          await supabaseClient
            .from(tableName)
            .update({ [key]: nv })
            .eq('id', entry.id);
          entry[key] = nv;
        });
        tr.appendChild(td);
      });
      // action cell
      const ac = document.createElement('td');
      if (entry.user_email === currentEmail) {
        const btn = document.createElement('button');
        btn.textContent = 'Delete';
        btn.addEventListener('click', async () => {
          await supabaseClient
            .from(tableName)
            .delete()
            .eq('id', entry.id);
        });
        ac.appendChild(btn);
      }
      tr.appendChild(ac);
      tbody.appendChild(tr);
    });

    // 4) totals row
    const totals = {};
    fields.forEach(k => totals[k] = 0);
    data.forEach(r =>
      fields.forEach(k => {
        const n = parseFloat(r[k]);
        if (!isNaN(n)) totals[k] += n;
      })
    );
    const trT = document.createElement('tr');
    trT.className = 'total-row';
    fields.forEach((k, i) => {
      const td = document.createElement('td');
      td.textContent = i === 0
        ? 'Total'
        : (totals[k] ? totals[k].toFixed(2) : '');
      trT.appendChild(td);
    });
    trT.appendChild(document.createElement('td'));
    tbody.appendChild(trT);
  }

  // Dark-mode toggle
  toggleBtn?.addEventListener('click', () =>
    document.body.classList.toggle('dark-mode')
  );

  // Initialize
  buildHeader();
  loadEntries();
});
