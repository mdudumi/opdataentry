// js/script.js

// — Your Supabase credentials —
const SUPABASE_URL = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…'; // anon public key

// — Initialize client under its own name —
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const form       = document.getElementById('wellForm');
  const padSelect  = document.getElementById('pad');
  const wellSelect = document.getElementById('well');
  const tableBody  = document.querySelector('#previewTable tbody');
  const dateFilter = document.getElementById('dateFilter');
  const padFilter  = document.getElementById('padFilter');
  const wellFilter = document.getElementById('wellFilter');
  const toggleBtn  = document.getElementById('toggleMode');
  const exportBtn  = document.getElementById('exportBtn');

  const fields = [
    'entry_date','pad','well','tub_press','cas_press','speed','fluid_level',
    'torque','oil_press','oil_level','frecuenze','tank_volume','free_water',
    'bsw_tank','tank_temp','water_diluent','diesel_propane','chmc'
  ];

  let entries = [];

  // Load existing rows
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

  // Realtime subscription
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

  loadEntries();

  // Handle form submission → INSERT into Supabase
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {};
    fields.forEach(f => {
      const el = form.elements[f];
      payload[f] = el ? el.value || null : null;
    });

    const { error } = await supabaseClient
      .from('south1_entries')
      .insert([payload]);

    if (error) {
      console.error(error);
      alert(`Insert failed: ${error.message}`);
      return;
    }

    form.reset();
  });

  // Render table (filters, inline-edit, delete)
  function renderTable() {
    tableBody.innerHTML = '';
    const df = dateFilter?.value || '';
    const pf = padFilter?.value    || '';
    const wf = wellFilter?.value   || '';

    // Rebuild filter selects
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

    // Filter & draw rows
    entries
      .filter(e =>
        (!df || e.entry_date === df) &&
        (!pf || e.pad        === pf) &&
        (!wf || e.well       === wf)
      )
      .forEach((entry, i) => {
        const tr = document.createElement('tr');
        fields.forEach(key => {
          const td = document.createElement('td');
          td.textContent     = entry[key] ?? '';
          td.contentEditable = true;
          td.addEventListener('blur', async () => {
            const newVal = td.textContent.trim() || null;
            if (newVal === entry[key]) return;
            entry[key] = newVal;
            const { error } = await supabaseClient
              .from('south1_entries')
              .update({ [key]: newVal })
              .eq('id', entry.id);
            if (error) console.error('Update failed:', error);
          });
          tr.appendChild(td);
        });
        const actionTd = document.createElement('td');
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', async () => {
          const { error } = await supabaseClient
            .from('south1_entries')
            .delete()
            .eq('id', entry.id);
          if (error) console.error('Delete failed:', error);
          else loadEntries();
        });
        actionTd.appendChild(delBtn);
        tr.appendChild(actionTd);
        tableBody.appendChild(tr);
      });
  }

  // Export CSV
  exportBtn?.addEventListener('click', () => {
    const header = fields.join(',');
    const rows = entries.map(e =>
      fields.map(f => e[f] ?? '').join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'south1_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  });

  // Filters & Dark Mode toggle
  [dateFilter, padFilter, wellFilter].forEach(el =>
    el?.addEventListener('change', renderTable)
  );
  toggleBtn?.addEventListener('click', () =>
    document.body.classList.toggle('dark-mode')
  );
});
