// js/dropdowns.js

// ─── CONFIGURATION ────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';
// ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const statusEl = document.getElementById('status');

  // Redirect if module access is not Configuration
  if (sessionStorage.getItem('module_access') !== 'Configuration') {
    window.location.href = 'index.html';
    return;
  }

  // Tables to manage
  const tables = ['eroot', 'etype', 'earea', 'emethod', 'ewtype'];

  /**
   * Load & render a table’s rows into its tbody.
   */
  async function loadTable(which) {
    console.log(`→ loading table: ${which}`);
    const tbody = document.getElementById(`${which}-table-body`);
    if (!tbody) {
      console.error(`No <tbody> found for id="${which}-table-body"`);
      return;
    }
    tbody.innerHTML = '<tr><td colspan="2"><em>Loading…</em></td></tr>';

    const { data, error } = await sb
      .from(which)
      .select('id, value, position')
      .order('position', { ascending: true });

    if (error) {
      statusEl.textContent = `Error loading "${which}": ${error.message}`;
      tbody.innerHTML = '';
      return;
    }

    statusEl.textContent = '';
    tbody.innerHTML = data.map(r => `
      <tr data-id="${r.id}" data-which="${which}">
        <td>
          <input
            type="text"
            value="${r.value}"
            data-id="${r.id}"
            data-which="${which}"
            class="inline-input"
          />
        </td>
        <td class="actions">
          <button data-action="save" data-id="${r.id}" data-which="${which}">💾</button>
          <button data-action="delete" data-id="${r.id}" data-which="${which}">✕</button>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Insert a new row at the end of the table.
   */
  async function addRow(which, value) {
    const { data: rows, error: e1 } = await sb
      .from(which)
      .select('position')
      .order('position', { ascending: true });

    if (e1) throw new Error(`Could not get positions for "${which}": ${e1.message}`);

    const nextPos = rows.length ? rows[rows.length - 1].position + 1 : 0;
    const { error: e2 } = await sb
      .from(which)
      .insert([{ value, position: nextPos }]);

    if (e2) throw new Error(`Insert failed for "${which}": ${e2.message}`);
  }

  /**
   * Update an existing row.
   */
  async function saveRow(which, id, value) {
    const { error } = await sb
      .from(which)
      .update({ value })
      .eq('id', id);

    if (error) throw new Error(`Save failed for "${which}" id=${id}: ${error.message}`);
  }

  /**
   * Delete an existing row.
   */
  async function deleteRow(which, id) {
    const { error } = await sb
      .from(which)
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Delete failed for "${which}" id=${id}: ${error.message}`);
  }

  // ─── EVENT HANDLING ───────────────────────────────────────────────────
  document.body.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const which = btn.dataset.which;
    const id    = btn.dataset.id && +btn.dataset.id;

    try {
      // Add new rows
      if (btn.id === 'add-eroot') {
        const v = document.getElementById('new-eroot-val').value.trim();
        if (!v) throw new Error('Enter a value for Root');
        await addRow('eroot', v);
        document.getElementById('new-eroot-val').value = '';
        await loadTable('eroot');
        return;
      }
      if (btn.id === 'add-etype') {
        const v = document.getElementById('new-etype-val').value.trim();
        if (!v) throw new Error('Enter a value for Type');
        await addRow('etype', v);
        document.getElementById('new-etype-val').value = '';
        await loadTable('etype');
        return;
      }
      if (btn.id === 'add-earea') {
        const v = document.getElementById('new-earea-val').value.trim();
        if (!v) throw new Error('Enter a value for Area');
        await addRow('earea', v);
        document.getElementById('new-earea-val').value = '';
        await loadTable('earea');
        return;
      }
      if (btn.id === 'add-emethod') {
        const v = document.getElementById('new-emethod-val').value.trim();
        if (!v) throw new Error('Enter a value for Methodology');
        await addRow('emethod', v);
        document.getElementById('new-emethod-val').value = '';
        await loadTable('emethod');
        return;
      }
      if (btn.id === 'add-ewtype') {
        const v = document.getElementById('new-ewtype-val').value.trim();
        if (!v) throw new Error('Enter a value for Well Type');
        await addRow('ewtype', v);
        document.getElementById('new-ewtype-val').value = '';
        await loadTable('ewtype');
        return;
      }

      // Save existing
      if (btn.dataset.action === 'save') {
        const input = document.querySelector(`input[data-id="${id}"][data-which="${which}"]`);
        await saveRow(which, id, input.value);
        statusEl.textContent = 'Saved.';
      }

      // Delete existing
      if (btn.dataset.action === 'delete') {
        await deleteRow(which, id);
        await loadTable(which);
      }
    } catch (err) {
      statusEl.textContent = err.message;
    }
  });

  // Mark unsaved if editing
  document.body.addEventListener('input', e => {
    if (e.target.matches('.inline-input')) {
      statusEl.textContent = 'Unsaved changes… click 💾';
    }
  });

  // ─── INITIAL LOAD ───────────────────────────────────────────────────
  console.log('Initial table load for:', tables);
  tables.forEach(loadTable);
});
