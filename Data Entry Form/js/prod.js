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
  // ─── Modal & Back-button setup ─────────────────────────────────────
  const modal     = document.getElementById('filterModal');
  const headerBack = document.getElementById('headerBack');

  // hide modal immediately to avoid blink
  modal.style.display = 'none';

  // show back button if not on index
  if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
    headerBack.style.display = 'inline-block';
    headerBack.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  // ─── Module filter modal elements ─────────────────────────────────
  const modules   = document.querySelectorAll('.module-card');
  const titleSpan = document.getElementById('filterModuleName');
  const selRoot   = document.getElementById('filterRoot');
  const btnBack   = document.getElementById('filterBack');
  const btnEnter  = document.getElementById('filterEnter');

  // ─── Load dropdown options from Supabase ───────────────────────────
  async function loadDropdown(table, selectEl, labelField) {
    const { data, error } = await sb
      .from(table)
      .select(labelField)
      .order(labelField, { ascending: true });
    if (error) {
      console.error(`Error loading ${table}:`, error);
      return;
    }
    data.forEach(row => {
      const opt = document.createElement('option');
      opt.value       = row[labelField];
      opt.textContent = row[labelField];
      selectEl.appendChild(opt);
    });
  }

  // only load roots
  loadDropdown('eroot', selRoot, 'value');

  // ─── Show filter modal when clicking a module ─────────────────────
  modules.forEach(card => {
    card.addEventListener('click', () => {
      titleSpan.textContent = card.querySelector('h2').textContent;
      sessionStorage.setItem('selectedModule', card.dataset.module);
      modal.style.display = 'flex';
    });
  });

  // ─── Cancel / Back ─────────────────────────────────────────────────
  btnBack.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // ─── Enter: build query string and redirect ────────────────────────
  btnEnter.addEventListener('click', () => {
    const rootVal = selRoot.value;
    const params  = new URLSearchParams();
    if (rootVal) params.set('root', rootVal);

    window.location.href =
      'dentry.html' +
      (params.toString() ? `?${params}` : '');
  });
});