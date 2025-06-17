// js/script.js

// — Your Supabase credentials —
const SUPABASE_URL = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';
// — Initialize the Supabase client —
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
  // ─────────────────────────────────────
  // 1️⃣ Get the current user session
  // ─────────────────────────────────────
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError) {
    console.error('Auth error:', sessionError);
  }
  const currentUser = session?.user; // { id, email, ... }

  // ─────────────────────────────────────
  // 2️⃣ Grab DOM nodes
  // ─────────────────────────────────────
  const form       = document.getElementById('wellForm');
  const padSelect  = document.getElementById('pad');
  const wellSelect = document.getElementById('well');
  const tableBody  = document.querySelector('#previewTable tbody');
  const dateFilter = document.getElementById('dateFilter');
  const padFilter  = document.getElementById('padFilter');
  const wellFilter = document.getElementById('wellFilter');
  const toggleBtn  = document.getElementById('toggleMode');
  const exportBtn  = document.getElementById('exportBtn');

  // ─────────────────────────────────────
  // 3️⃣ Define form‐field keys
  // ─────────────────────────────────────
  const fields = [
    'entry_date','pad','well','tub_press','cas_press','speed','fluid_level',
    'torque','oil_press','oil_level','frecuenze','tank_volume','free_water',
    'bsw_tank','tank_temp','water_diluent','diesel_propane','chmc'
  ];

  // Local cache of rows
  let entries = [];

  // ─────────────────────────────────────
  // 4️⃣ Dynamic Pad → Well dropdown
  // ─────────────────────────────────────
  padSelect?.addEventListener('change', () => {
    wellSelect.innerHTML = '<option value="">-- Select Well --</option>';
    if (!padSelect.value) return;
    for (let i = 1; i <= 5; i++) {
      const name = `${padSelect.value}_Well_${i}`;
      wellSelect.appendChild(new Option(name, name));
    }
  });

  // ─────────────────────────────────────
  // 5️⃣ Load all entries from Supabase
  // ─────────────────────────────────────
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

  // ─────────────────────────────────────
  // 6️⃣ Real‐time subscription (INSERT/UPDATE/DELETE)
  // ─────────────────────────────────────
  supabaseClient
    .channel('public:south1_entries')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'south1_entries' },
      ({ new: row }) => {
        entries.unshift(row);
        renderTable();
      })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'south1_entries' },
      ({ new: row }) => {
        const idx = entries.findIndex(e => e.id === row.id);
        if (idx > -1) entries[idx] = row;
        renderTable();
      })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'south1_entries' },
      ({ old: row }) => {
        entries = entries.filter(e => e.id !== row.id);
        renderTable();
      })
    .subscribe();

  // initial fetch
  loadEntries();

  // ─────────────────────────────────────
  // 7️⃣ Handle form submission (INSERT)
  // ─────────────────────────────────────
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Build payload including user_id
    const payload = { user_id: currentUser?.id || null };
    fields.forEach(f => {
      payload[f] = form.elements[f]?.value || null;
    });

    // Insert and return the new row
    const { data, error } = await supabaseClient
      .from('south1_entries')
      .insert([payload])
      .select();

    if (error) {
      console.error('Insert error:', error);
      return alert(`Insert failed: ${error.message}`);
    }

    // Update local cache & re‐render
    entries.unshift(data[0]);
    renderTable();
    form.reset();
  });

  // ─────────────────────────────────────
  // 8️⃣ Render table + filters + inline‐edit + delete
  // ─────────────────────────────────────
  function renderTable() {
    tableBody.innerHTML = '';

    // a) Rebuild filter dropdowns and preserve selection
    const uniq = key => [...new Set(entries.map(e => e[key]).filter(Boolean))];

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

    // b) Get current filter values
    const df = dateFilter.value;
    const pf = padFilter.value;
    const wf = wellFilter.value;

    // c) Filter and draw rows
    entries
      .filter(e =>
        (!df || e.entry_date === df) &&
        (!pf || e.pad        === pf) &&
        (!wf || e.well       === wf)
      )
      .forEach(entry => {
        const tr = document.createElement('tr');

        // Data cells
        fields.forEach(key => {
          const td = document.createElement('td');
          td.textContent = entry[key] ?? '';

          // Only make editable if this row belongs to currentUser
          if (entry.user_id === currentUser?.id) {
            td.contentEditable = true;
            td.addEventListener('blur', async () => {
              const newVal = td.textContent.trim() || null;
              if (newVal === entry[key]) return;
              const { error } = await supabaseClient
                .from('south1_entries')
                .update({ [key]: newVal })
                .eq('id', entry.id);
              if (error) {
                console.error('Update failed:', error);
                alert(`Update failed: ${error.message}`);
              } else {
                entry[key] = newVal;
                renderTable();
              }
            });
          }

          tr.appendChild(td);
        });

        // Action cell (delete only if owner)
        const actionTd = document.createElement('td');
        if (entry.user_id === currentUser?.id) {
          const delBtn = document.createElement('button');
          delBtn.textContent = 'Delete';
          delBtn.addEventListener('click', async () => {
            const { error } = await supabaseClient
              .from('south1_entries')
              .delete()
              .eq('id', entry.id);
            if (error) {
              console.error('Delete failed:', error);
              alert(`Delete failed: ${error.message}`);
            } else {
              entries = entries.filter(e => e.id !== entry.id);
              renderTable();
            }
          });
          actionTd.appendChild(delBtn);
        }
        tr.appendChild(actionTd);

        tableBody.appendChild(tr);
      });
  }

  // ─────────────────────────────────────
  // 9️⃣ Export CSV
  // ─────────────────────────────────────
  exportBtn?.addEventListener('click', () => {
    const header = ['user_id', ...fields].join(',');
    const rows = entries.map(e =>
      [e.user_id, ...fields.map(f => e[f] ?? '')].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'south1_data.csv';
    a.click();
  });

  // ─────────────────────────────────────
  // 🔍 Filters & 🌙 Dark‐mode toggle
  // ─────────────────────────────────────
  [dateFilter, padFilter, wellFilter].forEach(el =>
    el?.addEventListener('change', renderTable)
  );
  toggleBtn?.addEventListener('click', () =>
    document.body.classList.toggle('dark-mode')
  );
});
