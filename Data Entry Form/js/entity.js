// entity.js

  // ─── Supabase setup & access guard ─────────────────────────────────
  const SUPABASE_URL      = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Guard: redirect if not logged into “Configuration”
(function(){
  if (sessionStorage.getItem('module_access') !== 'Configuration') {
    window.location.href = 'index.html';
  }
})();

// ─── Main logic ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof sb === 'undefined') {
    console.error('Supabase client missing');
    return;
  }

  // 1️⃣ Current user
  const currentEmail = sessionStorage.getItem('email') || 'anonymous@example.com';

  // 2️⃣ Config
  const tableName = 'entity';
  const fields    = ['name','root','start_date','end_date','comment'];

  // 3️⃣ State
  let entries = [];
  let roots   = [];
  // multi-sort: arrays of keys & dirs
  let sortKeys = [];
  let sortDirs = {};
  const filterValues = {};

  // 4️⃣ DOM refs
  const table       = document.querySelector('.table-wrapper table');
  const tbody       = table.querySelector('tbody');
  const titleCols   = table.querySelectorAll('thead tr.title-row th');
  const filterRow   = table.querySelector('thead tr.filter-row');
  const form        = document.getElementById('entityForm');
  const rootSelect  = document.getElementById('entityRoot');

  // autosize columns
  table.style.tableLayout = 'auto';
  table.style.width = '100%';

  // cache filter-cell templates then hide row
  const filterTemplates = Array.from(filterRow.children).map(cell => cell.innerHTML);
  filterRow.style.display = 'none';

  // attach hover handlers to each header to show filter inside
  titleCols.forEach((th, i) => {
    let filterDiv;
    th.style.position = 'relative';
    th.addEventListener('mouseenter', () => {
      filterDiv = document.createElement('div');
      filterDiv.className = 'filter-container';
      filterDiv.innerHTML = filterTemplates[i];
      filterDiv.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 1000;
      `;
      th.appendChild(filterDiv);
    });
    th.addEventListener('mouseleave', () => {
      if (filterDiv) th.removeChild(filterDiv);
    });
  });

  // 5️⃣ Populate Root dropdown
  async function loadRoots() {
    const { data, error } = await sb
      .from('eroot')
      .select('value')
      .order('value',{ ascending:true });
    if (error) return console.error('Error loading roots:', error);
    roots = data.map(r => r.value);
    rootSelect.innerHTML = '<option value="">-- Select Root --</option>' +
      roots.map(v => `<option value="${v}">${v}</option>`).join('');
  }

  // 6️⃣ Read filters
  function readFilters() {
    fields.forEach(f => {
      const op  = document.getElementById(`op-${f}`)?.value || '';
      let val   = document.getElementById(`val-${f}`)?.value || '';
      if ((f==='start_date'||f==='end_date') && op==='between') {
        val = [
          document.getElementById(`val-${f}-1`)?.value,
          document.getElementById(`val-${f}-2`)?.value
        ];
      }
      filterValues[f] = { op, val };
    });
  }

  // 7️⃣ Load entries
  async function loadEntries() {
    const { data, error } = await sb
      .from(tableName)
      .select('*')
      .order('created_at',{ ascending:false });
    if (error) return console.error('Fetch error:', error);
    entries = data || [];
    renderTable();
  }

  // 8️⃣ Real-time
  sb.channel(`public:${tableName}`)
    .on('postgres_changes',{ event:'*',schema:'public',table:tableName }, payload => {
      if (payload.eventType === 'INSERT') entries.unshift(payload.new);
      if (payload.eventType === 'UPDATE') {
        const idx = entries.findIndex(e => e.id === payload.new.id);
        if (idx > -1) entries[idx] = payload.new;
      }
      if (payload.eventType === 'DELETE') entries = entries.filter(e => e.id !== payload.old.id);
      renderTable();
    })
    .subscribe();

  // 9️⃣ Sorting handlers (multi)
  titleCols.forEach((th, i) => {
    th.addEventListener('click', (evt) => {
      if (i >= fields.length) return;
      const key = fields[i];
      // multi sort: shift-add else reset
      if (evt.shiftKey) {
        if (!sortKeys.includes(key)) sortKeys.push(key);
      } else {
        sortKeys = [key];
      }
      // toggle direction
      sortDirs[key] = sortDirs[key] === 'asc' ? 'desc' : 'asc';
      updateHeaders();
      renderTable();
    });
  });

  // update arrow indicators
  function updateHeaders() {
    titleCols.forEach((th, i) => {
      if (i < fields.length) {
        const key = fields[i];
        const dir = sortDirs[key];
        th.textContent = th.textContent.replace(/[▲▼]/g, '').trim();
        if (sortKeys.includes(key)) {
          th.textContent += dir === 'asc' ? ' ▲' : ' ▼';
        }
      }
    });
  }

  // 🔟 Render
  function renderTable() {
    readFilters();
    tbody.innerHTML = '';
    let data = [...entries];
    // Filter
    data = data.filter(row => fields.every(key => {
      const { op, val } = filterValues[key] || {};
      if (!op || !val) return true;
      const raw = row[key];
      if ((key==='start_date'||key==='end_date') && Array.isArray(val)) {
        const [d1,d2] = val;
        if (!d1||!d2) return true;
        const t = new Date(raw).getTime();
        return t >= new Date(d1).getTime() && t <= new Date(d2).getTime();
      }
      const cell = (raw ?? '').toString().toLowerCase();
      const v    = Array.isArray(val)? val : val.toString().toLowerCase();
      switch(op) {
        case '=': return cell===v;
        case 'contains': return cell.includes(v);
        case '<': return isNaN(cell)? new Date(raw)<new Date(val) : parseFloat(cell)<parseFloat(val);
        case '>': return isNaN(cell)? new Date(raw)>new Date(val) : parseFloat(cell)>parseFloat(val);
        default: return true;
      }
    }));
    // Multi-sort
    if (sortKeys.length) {
      data.sort((a,b) => {
        for (const key of sortKeys) {
          let av = a[key], bv = b[key];
          if (['start_date','end_date'].includes(key)) {
            av = new Date(av).getTime()||0; bv = new Date(bv).getTime()||0;
          } else {
            const na=parseFloat(av), nb=parseFloat(bv);
            if (!isNaN(na)&&!isNaN(nb)) { av=na; bv=nb; }
          }
          if (av < bv) return sortDirs[key]==='asc'? -1:1;
          if (av > bv) return sortDirs[key]==='asc'? 1:-1;
        }
        return 0;
      });
    }
    // Rows
    data.forEach(entry => {
      const tr = document.createElement('tr');
      fields.forEach(key => {
        const td = document.createElement('td');
        let display = '';
        if ((key==='start_date'||key==='end_date') && entry[key]) {
          const d=new Date(entry[key]); display=isNaN(d)?'':d.toLocaleDateString();
        } else display = entry[key]??'';
        if (entry.created_by===currentEmail) {
          if (key==='root') {
            const sel=document.createElement('select');
            sel.innerHTML='<option value="">--</option>'+roots.map(v=>
              `<option value="${v}"${v===entry.root?' selected':''}>${v}</option>`
            ).join('');
            sel.addEventListener('change',async()=>{
              await sb.from(tableName).update({root:sel.value||null}).eq('id',entry.id);
            });
            td.appendChild(sel);
          } else {
            td.textContent=display;
            td.contentEditable=true;
            td.addEventListener('blur',async()=>{
              let nv=td.textContent.trim()||null;
              if ((key==='start_date'||key==='end_date')&&nv)
                nv=new Date(nv).toISOString().split('T')[0];
              if (nv!==(entry[key]||null))
                await sb.from(tableName).update({[key]:nv}).eq('id',entry.id);
            });
          }
        } else td.textContent=display;
        tr.appendChild(td);
      });
      // actions
      const ac=document.createElement('td');
      if (entry.created_by===currentEmail) {
        const btn=document.createElement('button'); btn.textContent='Delete';
        btn.addEventListener('click',async()=>{
          await sb.from(tableName).delete().eq('id',entry.id);
          entries=entries.filter(e=>e.id!==entry.id);
          renderTable();
        });
        ac.appendChild(btn);
      }
      tr.appendChild(ac);
      tbody.appendChild(tr);
    });
  }

  // 1️⃣1️⃣ Insert
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const payload={
      created_by:currentEmail,
      name:document.getElementById('entityName').value||null,
      root:document.getElementById('entityRoot').value||null,
      start_date:document.getElementById('startDate').value||null,
      end_date:document.getElementById('endDate').value||null,
      comment:document.getElementById('comment').value||null
    };
    const {error}=await sb.from(tableName).insert([payload]);
    if(error) console.error('Insert failed:',error);
    else form.reset();
  });

  // 1️⃣2️⃣ Filter inputs → render
  table.querySelectorAll('thead tr.filter-row select, thead tr.filter-row input')
    .forEach(el=>el.addEventListener('input',renderTable));

  // 🚀 Init
  await loadRoots(); await loadEntries();
});

