// js/script.js

// — Your Supabase credentials —
const SUPABASE_URL = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';

// — Initialize the Supabase client —
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
document.addEventListener('DOMContentLoaded', () => {
  // 1️⃣ Get the email saved in index.html
  const currentEmail = sessionStorage.getItem('userEmail') || 'unknown@example.com';

  // 2️⃣ Grab DOM nodes
  const form       = document.getElementById('wellForm');
  const padSelect  = document.getElementById('pad');
  const wellSelect = document.getElementById('well');
  const tableBody  = document.querySelector('#previewTable tbody');
  const dateFilter = document.getElementById('dateFilter');
  const padFilter  = document.getElementById('padFilter');
  const wellFilter = document.getElementById('wellFilter');
  const toggleBtn  = document.getElementById('toggleMode');
  const exportBtn  = document.getElementById('exportBtn');

  // 3️⃣ Your form fields
  const fields = [
    'entry_date','pad','well','tub_press','cas_press','speed','fluid_level',
    'torque','oil_press','oil_level','frecuenze','tank_volume','free_water',
    'bsw_tank','tank_temp','water_diluent','diesel_propane','chmc'
  ];

  let entries = [];

  // 4️⃣ Pad → Well dropdown
  padSelect?.addEventListener('change', () => {
    wellSelect.innerHTML = '<option value="">-- Select Well --</option>';
    if (!padSelect.value) return;
    for (let i = 1; i <= 5; i++) {
      const name = `${padSelect.value}_Well_${i}`;
      wellSelect.appendChild(new Option(name, name));
    }
  });

  // 5️⃣ Load existing entries
  async function loadEntries() {
    const { data, error } = await supabaseClient
      .from('south1_entries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Fetch error:', error);
      return;
    }
    entries = data;
    renderTable();
  }

  // 6️⃣ Realtime subscribe (INSERT/UPDATE/DELETE)
  supabaseClient
    .channel('public:south1_entries')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'south1_entries' },
      ({ new: row }) => { entries.unshift(row); renderTable(); })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'south1_entries' },
      ({ new: row }) => {
        const i = entries.findIndex(e => e.id === row.id);
        if (i > -1) entries[i] = row;
        renderTable();
      })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'south1_entries' },
      ({ old: row }) => {
        entries = entries.filter(e => e.id !== row.id);
        renderTable();
      })
    .subscribe();

  loadEntries();

  // 7️⃣ Handle form submit → INSERT with user_email
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = { user_email: currentEmail };
    fields.forEach(f => {
      payload[f] = form.elements[f]?.value || null;
    });

    const { data, error } = await supabaseClient
      .from('south1_entries')
      .insert([payload])
      .select();

    if (error) {
      console.error('Insert error:', error);
      return alert(`Insert failed: ${error.message}`);
    }

    entries.unshift(data[0]);
    renderTable();
    form.reset();
  });

  // 8️⃣ Render table + filters + inline edit + delete
  function renderTable() {
    tableBody.innerHTML = '';
    const uniq = key => [...new Set(entries.map(e => e[key]).filter(Boolean))];

    // rebuild filters (preserve selection)
    if (dateFilter) {
      const prev = dateFilter.value;
      dateFilter.innerHTML =
        `<option value="">All Dates</option>` +
        uniq('entry_date').map(v => `<option value="${v}">${v}</option>`).join('');
      dateFilter.value = prev;
    }
    if (padFilter) {
      const prev = padFilter.value;
      padFilter.innerHTML =
        `<option value="">All PADs</option>` +
        uniq('pad').map(v => `<option value="${v}">${v}</option>`).join('');
      padFilter.value = prev;
    }
    if (wellFilter) {
      const prev = wellFilter.value;
      wellFilter.innerHTML =
        `<option value="">All Wells</option>` +
        uniq('well').map(v => `<option value="${v}">${v}</option>`).join('');
      wellFilter.value = prev;
    }

    // read filters
    const df = dateFilter.value, pf = padFilter.value, wf = wellFilter.value;

    // draw rows
    entries
      .filter(e =>
        (!df || e.entry_date === df) &&
        (!pf || e.pad        === pf) &&
        (!wf || e.well       === wf)
      )
      .forEach(entry => {
        const tr = document.createElement('tr');

        // data cells
        fields.forEach(key => {
          const td = document.createElement('td');
          td.textContent = entry[key] ?? '';
          td.contentEditable = entry.user_email === currentEmail; // only owner edits
          td.addEventListener('blur', async () => {
            const newVal = td.textContent.trim() || null;
            if (newVal === entry[key]) return;
            const { error } = await supabaseClient
              .from('south1_entries')
              .update({ [key]: newVal })
              .eq('id', entry.id);
            if (error) {
              console.error('Update failed:', error);
              return alert(`Update failed: ${error.message}`);
            }
            entry[key] = newVal;
            renderTable();
          });
          tr.appendChild(td);
        });

        // action cell (delete only for owner)
        const tdAction = document.createElement('td');
        if (entry.user_email === currentEmail) {
          const btn = document.createElement('button');
          btn.textContent = 'Delete';
          btn.addEventListener('click', async () => {
            const { error } = await supabaseClient
              .from('south1_entries')
              .delete()
              .eq('id', entry.id);
            if (error) {
              console.error('Delete failed:', error);
              return alert(`Delete failed: ${error.message}`);
            }
            entries = entries.filter(e => e.id !== entry.id);
            renderTable();
          });
          tdAction.appendChild(btn);
        }
        tr.appendChild(tdAction);

        tableBody.appendChild(tr);
      });
  }

  // 9️⃣ Export CSV
  exportBtn?.addEventListener('click', () => {
    const header = ['user_email', ...fields].join(',');
    const rows = entries.map(e =>
      [e.user_email, ...fields.map(f => e[f] ?? '')].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'south1_data.csv';
    a.click();
  });

  // 🔍 Filters & 🌙 Dark mode toggle
  [dateFilter, padFilter, wellFilter].forEach(el =>
    el?.addEventListener('change', renderTable)
  );
  toggleBtn?.addEventListener('click', () =>
    document.body.classList.toggle('dark-mode')
  );
});
