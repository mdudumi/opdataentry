// js/script.js

// — Your Supabase credentials —
const SUPABASE_URL = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';

// — Initialize client under its own name —
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
  // — DOM nodes —
  const form       = document.getElementById('wellForm');
  const padSelect  = document.getElementById('pad');
  const wellSelect = document.getElementById('well');
  const tableBody  = document.querySelector('#previewTable tbody');
  const dateFilter = document.getElementById('dateFilter');
  const padFilter  = document.getElementById('padFilter');
  const wellFilter = document.getElementById('wellFilter');
  const toggleBtn  = document.getElementById('toggleMode');
  const exportBtn  = document.getElementById('exportBtn');

  // — Field list —
  const fields = [
    'entry_date','pad','well','tub_press','cas_press','speed','fluid_level',
    'torque','oil_press','oil_level','frecuenze','tank_volume','free_water',
    'bsw_tank','tank_temp','water_diluent','diesel_propane','chmc'
  ];

  let entries = [];

  // 🔄 Dynamic Pad → Well dropdown
  padSelect?.addEventListener('change', () => {
    wellSelect.innerHTML = '<option value="">-- Select Well --</option>';
    if (!padSelect.value) return;
    for (let i = 1; i <= 5; i++) {
      const name = `${padSelect.value}_Well_${i}`;
      wellSelect.appendChild(new Option(name, name));
    }
  });

  // 🚀 Fetch existing entries from Supabase
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

  // 🔔 Realtime subscription for INSERTs
  supabaseClient
    .channel('public:south1_entries')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'south1_entries' },
      ({ new: row }) => {
        entries.unshift(row);
        renderTable();
      }
    )
    .subscribe();

  // initial load
  loadEntries();

  // ➕ Handle form submission → INSERT into Supabase
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {};
    fields.forEach(f => {
      const el = form.elements[f];
      payload[f] = el ? el.value || null : null;
    });

    const { data, error } = await supabaseClient
      .from('south1_entries')
      .insert([payload])
      .select(); // return the new row

    if (error) {
      console.error('Insert error:', error);
      alert(`Insert failed: ${error.message}`);
      return;
    }

    // immediately show it in the table
    entries.unshift(data[0]);
    renderTable();
    form.reset();
  });

  // 📊 Render table (with filters, inline-edit & delete)
  function renderTable() {
    tableBody.innerHTML = '';
    const df = dateFilter.value || '';
    const pf = padFilter.value    || '';
    const wf = wellFilter.value   || '';

    // rebuild filter dropdowns
    const uniq = key => [...new Set(entries.map(e => e[key]).filter(Boolean))];
    if (dateFilter) dateFilter.innerHTML =
      `<option value="">All Dates</option>` +
      uniq('entry_date').map(v => `<option>${v}</option>`).join('');
    if (padFilter)  padFilter.innerHTML  =
      `<option value="">All PADs</option>` +
      uniq('pad').map(v => `<option>${v}</option>`).join('');
    if (wellFilter) wellFilter.innerHTML =
      `<option value="">All Wells</option>` +
      uniq('well').map(v => `<option>${v}</option>`).join('');

    // filter & draw rows
    entries
      .filter(e =>
        (!df || e.entry_date === df) &&
        (!pf || e.pad        === pf) &&
        (!wf || e.well       === wf)
      )
      .forEach((entry, i) => {
        const tr = document.createElement('tr');

        // data cells (inline-editable)
        fields.forEach(key => {
          const td = document.createElement('td');
          td.textContent     = entry[key] ?? '';
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
            }
          });
          tr.appendChild(td);
        });

        // delete button
        const actionTd = document.createElement('td');
        const delBtn   = document.createElement('button');
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
        tr.appendChild(actionTd);

        tableBody.appendChild(tr);
      });
  }

  // 📥 Export CSV
  exportBtn?.addEventListener('click', () => {
    const header = fields.join(',');
    const rows = entries.map(e =>
      fields.map(f => e[f] ?? '').join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'south1_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // 🔍 Filters & 🌙 Dark Mode toggle
  [dateFilter, padFilter, wellFilter].forEach(el =>
    el?.addEventListener('change', renderTable)
  );
  toggleBtn?.addEventListener('click', () =>
    document.body.classList.toggle('dark-mode')
  );
});
