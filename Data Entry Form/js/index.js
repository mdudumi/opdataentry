// ─── Supabase setup ─────────────────────────────────────────────────
    const SUPABASE_URL      = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY,{ db: { schema: 'logdetails' } });

// Map moduleKey → target page
const pageMap = {
  Configuration:   'config.html',
  Production:      'prod.html',
  Workover:        'workover.html',
  Pumps: 	   'pumps.html',
};

let selectedModule = null;

// Show the login modal
function openLogin(moduleKey) {
  selectedModule = moduleKey;
  document.getElementById('loginError').textContent = '';
  document.getElementById('modalModuleName').textContent = moduleKey;
  document.getElementById('loginModal').style.display = 'flex';
}

// Hide the login modal
function closeLogin() {
  document.getElementById('loginModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
  // Attach click & keypress handlers to every module card
  document.querySelectorAll('.module-card').forEach(function(card) {
    const moduleKey = card.getAttribute('data-module');
    if (!pageMap[moduleKey]) return;

    card.addEventListener('click', function() {
      openLogin(moduleKey);
    });
    card.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        openLogin(moduleKey);
      }
    });
  });

  // Cancel button in modal
  document.getElementById('loginCancel').addEventListener('click', closeLogin);

  // Submit button in modal
  document.getElementById('loginSubmit').addEventListener('click', async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value.trim();
    const errEl = document.getElementById('loginError');

    if (!email || !pass) {
      errEl.textContent = 'Please enter both email and password.';
      return;
    }

    // Query Supabase for matching user + module
    const { data, error } = await sb
      .from('logdetails.users')
      .select('id')
      .eq('email', email)
      .eq('password_hash', pass)       // in prod, compare hashed password
      .eq('module', selectedModule)
      .limit(1);

    if (error) {
      console.error(error);
      errEl.textContent = 'Server error—check console.';
      return;
    }
    if (!data || data.length === 0) {
      errEl.textContent = 'Invalid credentials for this module.';
      return;
    }

// Success: record login and navigate
    sessionStorage.setItem('module_access', selectedModule);
    sessionStorage.setItem('email', email);        // ← store the email here
    closeLogin();
    window.location.href = pageMap[selectedModule];
  });
});
