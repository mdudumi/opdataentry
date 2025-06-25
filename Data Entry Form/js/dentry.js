(async function(){
  // ── PAGE DEFINITIONS ────────────────────────────────────────────
  const PAGES = {
    well: { table: 'eprodwell', title: 'Well Production Data', fields: [
      'entry_date','entity','well','shift','meas_no','tub_press','cas_press','speed','fluid_level',
      'torque','hrs','fluidprd','loadoil','loadwater','fdt','solar','efficiency','oil','operator_comment'
    ]},
    tank: { table: 'eprodtank', title: 'Tank Production Data', fields: [
      'entry_date','entity','tank_name','well','shift','meas_no','tank_volume','free_water','bsw_tank',
      'tank_temp','water','operator_comment'
    ]},
    other: { table: 'eprodother', title: 'Other Production Data', fields: [
      'entry_date','entity','tank_name','well','shift','meas_no','oil_press','oil_level','frequency','diesel',
      'chmc','diluent','propane','operator_comment'
    ]}
  };

  // ── STATE ───────────────────────────────────────────────────────
  let currentPage = 'well';
  let entries = [];
  let allowedEntities = [];
  let sortOrders = [];
    const SUPABASE_URL      = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


  if (sessionStorage.getItem('module_access') !== 'Production') {
    window.location.href = 'index.html';
    return;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('.tab-btn').forEach(btn =>
      btn.addEventListener('click', () => switchPage(btn.dataset.page))
    );
    await switchPage(currentPage);
  });

  async function switchPage(pageKey) {
    if (!PAGES[pageKey]) return;
    currentPage = pageKey;
    const cfg = PAGES[pageKey];

    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.page === pageKey)
    );
    document.querySelector('.page-title').textContent = cfg.title;
    document.title = cfg.title;

    entries = [];
    sortOrders = [];
    if (window.activeSub) sb.removeSubscription(window.activeSub);

    buildForm(cfg.fields);
    buildTableHeader(cfg.fields);
    await loadLookups();
    await loadEntries();
    subscribeToRealtime(cfg.table);
  }

  function buildForm(fields) {
    const form = document.getElementById('entryForm');
    const submitBtn = form.querySelector('button[type=submit]');
    form.innerHTML = '';
    form.appendChild(submitBtn);

    fields.forEach(key => {
      const grp = document.createElement('div'); grp.className = 'form-group';
      const lbl = document.createElement('label'); lbl.htmlFor = key;
      lbl.textContent = key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      let ctrl;
      if (['entity','well','tank_name','shift'].includes(key)) {
        ctrl = document.createElement('select'); ctrl.id = key;
        if (key === 'shift') ctrl.innerHTML = `<option value="">-- Select shift --</option><option>Day</option><option>Night</option>`;
        else ctrl.innerHTML = `<option value="">-- Select ${key} --</option>`;
      } else {
        ctrl = document.createElement('input'); ctrl.id = key;
        if (key.includes('date')) ctrl.type = 'date';
        else if (/volume|temp|level|press|water|oil|hrs|no|frequency|diesel|propane|bsw/i.test(key)) {
          ctrl.type = 'number'; ctrl.step = 'any';
        } else ctrl.type = 'text';
      }
      grp.append(lbl, ctrl);
      form.insertBefore(grp, submitBtn);
    });

    form.onsubmit = async e => {
      e.preventDefault();
      const email = sessionStorage.getItem('email') || '';
      const payload = { created_by: email };
      const cfg = PAGES[currentPage];
      cfg.fields.forEach(key => {
        let v = document.getElementById(key).value || null;
        if (key.includes('date') && v) v = new Date(v).toISOString().split('T')[0];
        payload[key] = v;
      });
      const { error } = await sb.from(cfg.table).insert([payload], { returning: 'minimal' });
      if (error) return alert('Insert failed: ' + error.message);
      form.reset();
      await loadEntries();
    };
  }

  function buildTableHeader(fields) {
    const tr = document.querySelector('thead .title-row');
    tr.innerHTML = '';
    fields.forEach(key => {
      const th = document.createElement('th'); th.dataset.key = key;
      th.textContent = key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      th.onclick = e => {
        const ex = sortOrders.find(o=>o.key===key);
        if (e.shiftKey) ex ? ex.asc = !ex.asc : sortOrders.push({key,asc:true});
        else sortOrders = ex ? [{key,asc:!ex.asc}] : [{key,asc:true}];
        document.querySelectorAll('thead th').forEach(h=>h.classList.remove('sorted-asc','sorted-desc'));
        sortOrders.forEach(o=>{
          const h = document.querySelector(`th[data-key=\"${o.key}\"]`);
          h.classList.add(o.asc ? 'sorted-asc' : 'sorted-desc');
        }); renderTable();
      };
      tr.appendChild(th);
    });
    const thA = document.createElement('th'); thA.textContent = 'Actions'; tr.appendChild(thA);
  }

  async function loadLookups() {
    const root = sessionStorage.getItem('selectedRoot');
    const { data: ents = [] } = await sb.from('entity').select('id,name,root');
    const matching = ents.filter(e=>e.root===root);
    allowedEntities = matching.map(e=>e.id);
    window.__lookupMaps = { entity: Object.fromEntries(matching.map(e=>[e.id,e.name])), well: {}, tank: {} };

    // Map tank_name to tank lookup for display
    window.__lookupMaps['tank_name'] = window.__lookupMaps.tank;

    const selE = document.getElementById('entity'); selE.innerHTML = `<option value="">-- Select entity --</option>`;
    matching.forEach(e=> selE.append(new Option(e.name,e.id)));
    const { data: tanks = [] } = await sb.from('etank').select('id,name,entity_id');
    const tanksFor = tanks.filter(t=>allowedEntities.includes(t.entity_id));
    tanksFor.forEach(t=> window.__lookupMaps.tank[t.id]=t.name);
    const selT = document.getElementById('tank_name'); if (selT) { selT.innerHTML = `<option value="">-- Select tank --</option>`; tanksFor.forEach(t=> selT.append(new Option(t.name,t.id))); }
    const { data: wells = [] } = await sb.from('ewell').select('id,name,entity_id');
    const wellsFor = wells.filter(w=>allowedEntities.includes(w.entity_id));
    wellsFor.forEach(w=> window.__lookupMaps.well[w.id]=w.name);
    const selW = document.getElementById('well'); selW.innerHTML = `<option value="">-- Select well --</option>`;
    wellsFor.forEach(w=> selW.append(new Option(w.name,w.id)));
    selE.onchange = async e => {
      const id = e.target.value;
      if (selT) { const ft = tanksFor.filter(t=>t.entity_id===id); selT.innerHTML = `<option value="">-- Select tank --</option>`; ft.forEach(t=> selT.append(new Option(t.name,t.id))); }
      selW.innerHTML = `<option value="">-- Select well --</option>`;
      if (!id) return;
      const { data: ws = [] } = await sb.from('ewell').select('id,name').eq('entity_id',id);
      ws.forEach(w=> selW.append(new Option(w.name,w.id)));
    };
  }

  async function loadEntries() {
    if (!allowedEntities.length) { entries = []; renderTable(); return; }
    const { data } = await sb.from(PAGES[currentPage].table)
      .select('*').in('entity', allowedEntities).order('created_at',{ascending:false});
    entries = data || [];
    renderTable();
  }

  function subscribeToRealtime(tbl) {
    if (!allowedEntities.length) return;
    window.activeSub = sb.from(tbl)
      .on('INSERT',p=>{ entries.unshift(p.new); renderTable(); })
      .on('UPDATE',p=>{ entries=entries.map(r=>r.id===p.new.id?p.new:r); renderTable(); })
      .on('DELETE',p=>{ entries=entries.filter(r=>r.id!==p.old.id); renderTable(); })
      .subscribe();
  }

  function isNumberField(key) {
    return /volume|temp|level|press|water|oil|hrs|no|frequency|diesel|propane|bsw/i.test(key);
  }

  async function updateCell(id, key, rawValue) {
    let value = rawValue;
    if (key.includes('date')) {
      value = rawValue ? new Date(rawValue).toISOString().split('T')[0] : null;
    } else if (isNumberField(key)) {
      value = rawValue.trim() === '' ? null : Number(rawValue);
    }
    const { error } = await sb.from(PAGES[currentPage].table)
      .update({ [key]: value })
      .eq('id', id);
    if (error) alert(`Update failed for ${key}: ${error.message}`);
  }

  function renderTable(){
    const tbody = document.getElementById('entryTableBody'); tbody.innerHTML = '';
    const fields = PAGES[currentPage].fields;
    const user = sessionStorage.getItem('email') || '';
    entries
      .filter(r=>allowedEntities.includes(r.entity))
      .sort((a,b)=>{
        for (let o of sortOrders) {
          const aVal = a[o.key], bVal = b[o.key];
          const cmp = o.key.includes('date')
            ? (new Date(aVal||0) - new Date(bVal||0))
            : (''+aVal).localeCompare(bVal||'',undefined,{numeric:true});
          if (cmp) return o.asc ? cmp : -cmp;
        }
        return 0;
      })
      .forEach(r=>{
        const tr = document.createElement('tr');
        fields.forEach(key=>{
          const td = document.createElement('td');
          let txt = r[key] == null ? '' : r[key];
          if (window.__lookupMaps[key] && r[key]!=null) txt = window.__lookupMaps[key][r[key]];
          else if (key.includes('date') && txt) txt = new Date(txt).toLocaleDateString();
          td.textContent = txt;
          if (r.created_by === user) {
            td.contentEditable = true;
            td.addEventListener('blur', () => updateCell(r.id, key, td.textContent));
            td.addEventListener('keydown', e => {
              if (e.key === 'Enter') { e.preventDefault(); td.blur(); }
            });
          }
          tr.appendChild(td);
        });
        const ac = document.createElement('td');
        if (r.created_by === user) {
          const delBtn = document.createElement('button');
          delBtn.textContent = 'Delete';
          delBtn.onclick = async () => {
            const { error } = await sb.from(PAGES[currentPage].table).delete().eq('id', r.id);
            if (error) alert('Delete failed: ' + error.message);
          };
          ac.appendChild(delBtn);
        }
        tr.appendChild(ac);
        tbody.appendChild(tr);
      });
  }

})();
