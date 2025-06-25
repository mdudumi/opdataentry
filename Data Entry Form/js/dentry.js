(async function(){
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

  let currentPage = 'well', entries = [], allowedEntities = [], sortOrders = [], filters = {};
    const SUPABASE_URL      = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


  // Redirect if no access
  if (sessionStorage.getItem('module_access') !== 'Production') {
    window.location.href = 'index.html';
    return;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    // Inject filter styles
    const style = document.createElement('style');
    style.textContent = `
      thead tr.filter-row th { background: #f9f9f9; padding: 0.5rem; }
      .header-filter .filter-op { border: none; background: transparent; opacity: 0; transition: opacity 0.2s; }
      th:hover .filter-op { opacity: 1; }
      .filter-inputs { position: relative; }
      .filter-range { width: 100%; padding: 0.25rem 0.5rem; border-radius: 0.25rem; border: 1px solid #ccc; font-size: 0.9rem; }
    `;
    document.head.appendChild(style);

    // Initialize tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchPage(btn.dataset.page)));
    await switchPage(currentPage);
  });

  async function switchPage(pageKey) {
    if (!PAGES[pageKey]) return;
    currentPage = pageKey;
    const cfg = PAGES[pageKey];
    document.title = cfg.title;
    document.querySelector('.page-title').textContent = cfg.title;
    entries = []; sortOrders = []; filters = {};
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
        ctrl.innerHTML = `<option value="">-- Select ${key.replace(/_/g,' ')} --</option>`;
        if (key === 'shift') ctrl.innerHTML = `<option value="">-- Select shift --</option><option>Day</option><option>Night</option>`;
      } else {
        ctrl = document.createElement('input'); ctrl.id = key;
        if (isDateField(key)) ctrl.type = 'date';
        else if (isNumberField(key)) { ctrl.type = 'number'; ctrl.step = 'any'; }
        else ctrl.type = 'text';
      }
      grp.append(lbl, ctrl);
      form.insertBefore(grp, submitBtn);
    });

    form.onsubmit = async e => {
      e.preventDefault();
      const email = sessionStorage.getItem('email') || '';
      const payload = { created_by: email };
      PAGES[currentPage].fields.forEach(key => {
        let v = document.getElementById(key).value || null;
        if (isDateField(key) && v) v = new Date(v).toISOString().split('T')[0];
        payload[key] = v;
      });
      const { error } = await sb.from(PAGES[currentPage].table).insert([payload], { returning: 'minimal' });
      if (error) return alert('Insert failed: ' + error.message);
      form.reset();
      await loadEntries();
    };
  }

  function buildTableHeader(fields) {
    const thead = document.querySelector('thead');
    thead.innerHTML = '';

    // Header row
    const tr = document.createElement('tr');
    tr.className = 'filter-row';
    fields.forEach(key => {
      const th = document.createElement('th'); th.dataset.key = key; th.classList.add('header-filter');
      const lbl = document.createElement('span'); lbl.textContent = key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      lbl.className = 'col-label'; lbl.addEventListener('click', handleSort);
      const sel = document.createElement('select'); sel.className = 'filter-op';
      const ops = isDateField(key)
        ? ['between','=','!=','>','<']
        : isNumberField(key)
          ? ['=','!=','>','<','between']
          : ['contains','=','!=','between'];
      ops.forEach(op => sel.append(new Option(op, op)));
      sel.addEventListener('change', () => renderTable());

      const container = document.createElement('div'); container.className = 'filter-inputs';

      if (isDateField(key)) {
        const input = document.createElement('input');
        input.className = 'filter-range'; input.placeholder = 'Select date range';
        container.append(input);
      } else {
        const inp1 = document.createElement('input'); inp1.className = 'filter-val1'; inp1.placeholder = 'Value';
        inp1.type = isNumberField(key) ? 'number' : 'text';
        inp1.addEventListener('input', () => renderTable());
        const inp2 = document.createElement('input'); inp2.className = 'filter-val2'; inp2.placeholder = 'and'; inp2.type = inp1.type;
        inp2.style.display = 'none'; inp2.addEventListener('input', () => renderTable());
        sel.addEventListener('change', () => {
          inp2.style.display = sel.value === 'between' ? 'inline-block' : 'none';
        });
        container.append(inp1, inp2);
      }

      th.append(lbl, sel, container);
      tr.appendChild(th);
    });
    tr.appendChild(document.createElement('th')).textContent = 'Actions';
    thead.appendChild(tr);

    // Init date pickers
    setTimeout(() => {
      if (window.flatpickr) {
        document.querySelectorAll('input.filter-range').forEach(el => {
          flatpickr(el, {
            mode: 'range', dateFormat: 'Y-m-d',
            onChange: (dates, _, fp) => {
              const key = fp.input.closest('th').dataset.key;
              const [start, end] = dates;
              filters[key] = {
                op: 'between',
                val1: start ? fp.formatDate(start, 'Y-m-d') : null,
                val2: end   ? fp.formatDate(end,   'Y-m-d') : null
              };
              renderTable();
            }
          });
        });
      }
    }, 0);
  }

  async function loadLookups() {
    const root = sessionStorage.getItem('selectedRoot');
    const { data: ents } = await sb.from('entity').select('id,name,root');
    allowedEntities = ents.filter(e => e.root === root).map(e => e.id);

    window.__lookupMaps = { entity: {}, well: {}, tank_name: {}, well: {}, tank: {} };
    ents.filter(e => allowedEntities.includes(e.id)).forEach(e => { window.__lookupMaps.entity[e.id] = e.name; });

    const { data: wells } = await sb.from('ewell').select('id,name,entity_id');
    wells.filter(w => allowedEntities.includes(w.entity_id)).forEach(w => window.__lookupMaps.well[w.id] = w.name);

    const { data: tanks } = await sb.from('etank').select('id,name,entity_id');
    tanks.filter(t => allowedEntities.includes(t.entity_id)).forEach(t => window.__lookupMaps.tank_name[t.id] = t.name);

    // Populate selects
    const selE = document.getElementById('entity');
    selE.innerHTML = '<option value="">-- Select entity --</option>';
    Object.entries(window.__lookupMaps.entity).forEach(([id,name]) => selE.append(new Option(name, id)));

    selE.addEventListener('change', async e => {
      const id = e.target.value;
      // update wells
      const selW = document.getElementById('well'); selW.innerHTML = '<option value="">-- Select well --</option>';
      if (id) {
        const { data: ws } = await sb.from('ewell').select('id,name').eq('entity_id', id);
        ws.forEach(w => selW.append(new Option(w.name, w.id)));
      }
      // update tanks
      const selT = document.getElementById('tank_name'); if (selT) {
        selT.innerHTML = '<option value="">-- Select tank --</option>';
        if (id) {
          const { data: ts } = await sb.from('etank').select('id,name').eq('entity_id', id);
          ts.forEach(t => selT.append(new Option(t.name, t.id)));
        }
      }
    });
  }

  async function loadEntries() {
    if (!allowedEntities.length) { entries = []; return renderTable(); }
    const { data } = await sb.from(PAGES[currentPage].table)
      .select('*')
      .in('entity', allowedEntities)
      .order('created_at', { ascending: false });
    entries = data || [];
    renderTable();
  }

  function subscribeToRealtime(table) {
    if (!allowedEntities.length) return;
    window.activeSub = sb.from(table)
      .on('INSERT', p => { entries.unshift(p.new); renderTable(); })
      .on('UPDATE', p => { entries = entries.map(r => r.id===p.new.id ? p.new : r); renderTable(); })
      .on('DELETE', p => { entries = entries.filter(r => r.id!==p.old.id); renderTable(); })
      .subscribe();
  }

  function renderTable() {
    const tbody = document.getElementById('entryTableBody'); tbody.innerHTML='';
    const user = sessionStorage.getItem('email');

    entries
      .filter(r => allowedEntities.includes(r.entity))
      .filter(r => {
        return PAGES[currentPage].fields.every(key => {
          const f = filters[key]; if (!f || !f.op) return true;
          const c = r[key]==null ? '' : String(r[key]);
          switch(f.op) {
            case 'contains': return c.toLowerCase().includes(f.val1.toLowerCase());
            case '=': return c===f.val1;
            case '!=': return c!==f.val1;
            case '>': return Number(c)>Number(f.val1);
            case '<': return Number(c)<Number(f.val1);
            case 'between': {
              if (isDateField(key)) {
                const d = new Date(r[key]).toISOString().split('T')[0];
                return d >= f.val1 && d <= f.val2;
              }
              const n = Number(c);
              return n >= Number(f.val1) && n <= Number(f.val2);
            }
            default: return true;
          }
        });
      })
      .sort(compareEntries)
      .forEach(r => {
        const tr = document.createElement('tr');
        PAGES[currentPage].fields.forEach(key => {
          const td = document.createElement('td');
          let txt = r[key]==null ? '' : r[key];
          if (window.__lookupMaps[key] && r[key]!=null) txt = window.__lookupMaps[key][r[key]];
          else if (isDateField(key) && txt) txt = new Date(txt).toLocaleDateString();
          td.textContent = txt;
          if (r.created_by===user) {
            td.contentEditable = true;
            td.addEventListener('blur', () => updateCell(r.id, key, td.textContent));
            td.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); td.blur(); }});
          }
          tr.append(td);
        });
        const ac = document.createElement('td');
        if (r.created_by===user) {
          const btn = document.createElement('button'); btn.textContent='Delete';
          btn.addEventListener('click', async ()=>{
            const { error } = await sb.from(PAGES[currentPage].table).delete().eq('id', r.id);
            if(error) alert('Delete failed: '+error.message);
          });
          ac.append(btn);
        }
        tr.append(ac);
        tbody.append(tr);
      });
  }

  async function updateCell(id, key, raw) {
    let value = raw;
    if (isDateField(key)) {
      value = raw ? new Date(raw).toISOString().split('T')[0] : null;
    } else if (isNumberField(key)) {
      value = raw.trim()==='' ? null : Number(raw);
    }
    const { error } = await sb.from(PAGES[currentPage].table).update({ [key]: value }).eq('id', id);
    if (error) alert(`Update failed for ${key}: ${error.message}`);
  }

  function handleSort(e) {
    const key = e.currentTarget.closest('th').dataset.key;
    const existing = sortOrders.find(o=>o.key===key);
    if (e.shiftKey) {
      if (existing) existing.asc = !existing.asc;
      else sortOrders.push({key,asc:true});
    } else {
      sortOrders = existing ? [{key,asc:!existing.asc}] : [{key,asc:true}];
    }
    document.querySelectorAll('th').forEach(h=>h.classList.remove('sorted-asc','sorted-desc'));
    sortOrders.forEach(o=>{
      const h = document.querySelector(`th[data-key="${o.key}"]`);
      h.classList.add(o.asc?'sorted-asc':'sorted-desc');
    });
    renderTable();
  }

  function compareEntries(a,b) {
    for (const o of sortOrders) {
      const av = a[o.key], bv = b[o.key];
      let cmp;
      if (isDateField(o.key)) cmp = new Date(av||0) - new Date(bv||0);
      else cmp = String(av||'').localeCompare(String(bv||''), undefined, {numeric:true});
      if (cmp) return o.asc ? cmp : -cmp;
    }
    return 0;
  }

  function isDateField(k){ return k.includes('date'); }
  function isNumberField(k){ return /volume|temp|level|press|water|oil|hrs|no|frequency|diesel|propane|bsw/i.test(k); }
})();
