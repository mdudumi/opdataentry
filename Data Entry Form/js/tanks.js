;
(async function() {

// ─── Supabase setup & guard ────────────────────────────────────────────────
  const SUPABASE_URL      = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 if (sessionStorage.getItem('module_access') !== 'Configuration') {
    window.location.href = 'index.html';
    return;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const currentEmail = sessionStorage.getItem('email') || '';
    const tableName = 'etank';
    const fields = ['entity_id', 'ewell_id', 'name', 'type', 'comment', 'start_date', 'end_date'];

    let entries = [];
    let entitiesList = [];
    let ewellsList = [];
    let typesList = [];
    const filters = { entity_id: '', ewell_id: '', type: '' };
    let sortOrders = [];

    const entitySelect = document.getElementById('entitySelect');
    const hiddenEntityId = document.getElementById('entityIdInput');
    const ewellSelect = document.getElementById('ewellSelect');
    const hiddenEwellId = document.getElementById('ewellIdInput');
    const typeSelect = document.getElementById('tankType');
    const form = document.getElementById('etankForm');
    const tbody = document.querySelector('.table-wrapper table tbody');
    const titleCells = Array.from(document.querySelectorAll('thead tr.title-row th')).slice(0, fields.length);

    function updateSortIndicators() {
      titleCells.forEach(th => {
        const key = th.dataset.key;
        const indicator = th.querySelector('.sort-indicator');
        if (indicator) indicator.remove();
        const order = sortOrders.find(o => o.key === key);
        if (order) {
          const span = document.createElement('span');
          span.className = 'sort-indicator';
          span.textContent = order.asc ? ' ▲' : ' ▼';
          th.appendChild(span);
        }
      });
    }

    async function loadLookups() {
      const [eRes, wRes, tRes] = await Promise.all([
        sb.from('entity').select('id,name').order('name'),
        sb.from('ewell').select('id,name').order('name'),
        sb.from('etype').select('value').order('value')
      ]);
      entitiesList = eRes.data || [];
      ewellsList = wRes.data || [];
      typesList = (tRes.data || []).map(r => r.value);

      const fillSelect = (sel, list, textOnly = false) => {
        sel.innerHTML = `<option value="">-- Select --</option>` +
          list.map(item => {
            const v = textOnly ? item : item.id;
            const t = textOnly ? item : item.name;
            return `<option value=\"${v}\">${t}</option>`;
          }).join('');
      };
      fillSelect(entitySelect, entitiesList);
      fillSelect(ewellSelect, ewellsList);
      fillSelect(typeSelect, typesList, true);

      // set up filters and sort on headers
      titleCells.forEach((th, idx) => {
        const key = fields[idx];
        th.dataset.key = key;
        const sel = th.querySelector('select');
        if (sel) {
          let items = [];
          if (key === 'entity_id') items = entitiesList;
          else if (key === 'ewell_id') items = ewellsList;
          else if (key === 'type') items = typesList.map(v => ({ id: v, name: v }));
          sel.innerHTML = `<option value="">All</option>` + items.map(i => `<option value=\"${i.id}\">${i.name}</option>`).join('');
          sel.onchange = () => { filters[key] = sel.value; renderTable(); };
        }
        th.style.cursor = 'pointer';
        th.addEventListener('click', e => {
          if (e.target.tagName === 'SELECT') return;
          const existing = sortOrders.find(o => o.key === key);
          if (e.shiftKey) {
            if (existing) existing.asc = !existing.asc;
            else sortOrders.push({ key, asc: true });
          } else {
            if (existing) {
              existing.asc = !existing.asc;
              sortOrders = [existing];
            } else {
              sortOrders = [{ key, asc: true }];
            }
          }
          renderTable();
        });
      });

      entitySelect.onchange = () => hiddenEntityId.value = entitySelect.value;
      ewellSelect.onchange = () => hiddenEwellId.value = ewellSelect.value;
    }

    async function loadEntries() {
      const { data, error } = await sb.from(tableName).select('*').order('id', { ascending: false });
      if (error) return console.error('Fetch error:', error);
      entries = data;
      renderTable();
    }

    sb.channel(`public:${tableName}`)
      .on('postgres_changes', { event: ['INSERT', 'UPDATE', 'DELETE'], schema: 'public', table: tableName }, payload => {
        const { eventType, new: n, old } = payload;
        if (eventType === 'INSERT') entries.unshift(n);
        if (eventType === 'UPDATE') entries = entries.map(e => e.id === n.id ? n : e);
        if (eventType === 'DELETE') entries = entries.filter(e => e.id !== old.id);
        renderTable();
      })
      .subscribe();

    function findName(list, id) {
      const x = list.find(i => i.id === id);
      return x ? x.name : '';
    }

    function compareField(key, a, b) {
      if (a == null) return -1;
      if (b == null) return 1;
      if (key === 'start_date' || key === 'end_date') return new Date(a) - new Date(b);
      if (key === 'entity_id') a = findName(entitiesList, a), b = findName(entitiesList, b);
      if (key === 'ewell_id') a = findName(ewellsList, a), b = findName(ewellsList, b);
      return a.toString().localeCompare(b.toString(), undefined, { numeric: true });
    }

    function renderTable() {
      updateSortIndicators();
      tbody.innerHTML = '';
      let list = [...entries];
      if (sortOrders.length) {
        list.sort((x, y) => {
          for (const { key, asc } of sortOrders) {
            const cmp = compareField(key, x[key], y[key]);
            if (cmp !== 0) return asc ? cmp : -cmp;
          }
          return 0;
        });
      }
      list = list.filter(e => (!filters.entity_id || e.entity_id == filters.entity_id)
                           && (!filters.ewell_id  || e.ewell_id  == filters.ewell_id)
                           && (!filters.type      || e.type      == filters.type));
      list.forEach(entry => {
        const tr = document.createElement('tr');
        fields.forEach(key => {
          const td = document.createElement('td');
          if (entry.created_by === currentEmail && ['entity_id','ewell_id','type'].includes(key)) {
            const sel = document.createElement('select');
            sel.className = 'form-pane-select';
            sel.append(new Option('--',''));
            const options = key==='type'? typesList.map(v=>({id:v,name:v})): key==='entity_id'? entitiesList: ewellsList;
            options.forEach(item => {
              const o = new Option(item.name, item.id);
              if (item.id === entry[key]?.toString()) o.selected = true;
              sel.append(o);
            });
            sel.onchange = async () => {
              const val = sel.value||null;
              const { data:updated, error } = await sb.from(tableName).update({[key]:val}).eq('id',entry.id).select();
              if (!error) { entries = entries.map(e=>e.id===entry.id?updated[0]:e); renderTable(); }
            };
            td.appendChild(sel);
          } else if (entry.created_by===currentEmail && ['name','comment','start_date','end_date'].includes(key)) {
            td.contentEditable = true;
            td.textContent = entry[key]||'';
            td.onblur = async () => {
              const v = td.textContent.trim()||null;
              if (v!==entry[key]) {
                const { data:updated, error } = await sb.from(tableName).update({[key]:v}).eq('id',entry.id).select();
                if (!error) { entries = entries.map(e=>e.id===entry.id?updated[0]:e); renderTable(); }
              }
            };
          } else {
            if (key==='entity_id') td.textContent = findName(entitiesList, entry.entity_id);
            else if (key==='ewell_id') td.textContent = findName(ewellsList, entry.ewell_id);
            else if ((key==='start_date'||key==='end_date') && entry[key]) td.textContent = new Date(entry[key]).toLocaleDateString();
            else td.textContent = entry[key]||'';
          }
          tr.appendChild(td);
        });
        const ac = document.createElement('td');
        if (entry.created_by===currentEmail) {
          const btn=document.createElement('button');btn.type='button';btn.textContent='Delete';
          btn.onclick=async()=>{const{error}=await sb.from(tableName).delete().eq('id',entry.id); if(!error){entries=entries.filter(e=>e.id!==entry.id);renderTable();}};
          ac.appendChild(btn);
        }
        tr.appendChild(ac);
        tbody.appendChild(tr);
      });
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const payload={created_by:currentEmail,entity_id:hiddenEntityId.value||null,ewell_id:hiddenEwellId.value||null,name:document.getElementById('tankName').value||null,type:typeSelect.value||null,comment:document.getElementById('comment').value||null,start_date:document.getElementById('startDate').value||null,end_date:document.getElementById('endDate').value||null};
      try{const{data,error}=await sb.from(tableName).insert([payload]).select(); if(!error){entries.unshift(data[0]);renderTable();form.reset();}}catch{}
    });

    await loadLookups();
    await loadEntries();
  });
})();
