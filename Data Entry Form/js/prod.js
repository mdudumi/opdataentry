// ─── Supabase setup ─────────────────────────────────────────────────
    const SUPABASE_URL      = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ─── Guard: require a module_access before doing anything ─────────────
(function(){
  if (!sessionStorage.getItem('module_access')) {
    window.location.href = 'index.html';
    return;
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  // ─── Header “Back” button ───────────────────────────────────────────
  const headerBack = document.getElementById('headerBack');
  if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
    headerBack.style.display = 'inline-block';
    headerBack.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  // ─── Module filter modal elements ─────────────────────────────────
  const modules   = document.querySelectorAll('.module-card');
  const modal     = document.getElementById('filterModal');
  const titleSpan = document.getElementById('filterModuleName');
  const selRoot   = document.getElementById('filterRoot');
  const selEntity = document.getElementById('filterEntity');
  const selWell   = document.getElementById('filterWell');
  const btnBack   = document.getElementById('filterBack');
  const btnEnter  = document.getElementById('filterEnter');

  // ─── Load dropdown options from Supabase ───────────────────────────
  async function loadDropdown(table, selectEl, labelField) {
    const { data, error } = await sb
      .from(table)
      .select(labelField)
      .order(labelField, { ascending: true });
    if (error) { console.error(`Error loading ${table}:`, error); return; }
    data.forEach(row => {
      const opt = document.createElement('option');
      opt.value       = row[labelField];
      opt.textContent = row[labelField];
      selectEl.appendChild(opt);
    });
  }

  loadDropdown('eroot',  selRoot,   'value');
  loadDropdown('entity', selEntity, 'name');
  loadDropdown('ewell',  selWell,   'name');

  // ─── Show filter modal when clicking a module ─────────────────────
  modules.forEach(card => {
    card.addEventListener('click', () => {
      const mod = card.dataset.module;
      titleSpan.textContent = card.querySelector('h2').textContent;
      sessionStorage.setItem('selectedModule', mod);
      modal.style.display = 'flex';
    });
  });

  // ─── Cancel / Back ─────────────────────────────────────────────────
  btnBack.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // ─── Enter: build query string and redirect ────────────────────────
btnEnter.addEventListener('click', () => {
  // read your filters
  const rootVal   = selRoot.value;
  const entityVal = selEntity.value;
  const wellVal   = selWell.value;

  // build query-string
  const params = new URLSearchParams();
  if (rootVal)   params.set('root',   rootVal);
  if (entityVal) params.set('entity', entityVal);
  if (wellVal)   params.set('well',   wellVal);

  // redirect to your static page
  window.location.href = 'production-data-entry.html' +
                         (params.toString() ? `?${params}` : '');
});
});