(async function() {
  // ─── Supabase setup & access guard ─────────────────────────────────
  const SUPABASE_URL      = 'https://nrkakpjugxncfyrgtpfr.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ya2FrcGp1Z3huY2Z5cmd0cGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTMyNjcsImV4cCI6MjA2NTc2OTI2N30.FzWYbNT792RH6rpxSr9OKlcjMV6qIuVL4oq_W9lsmQs';

  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (sessionStorage.getItem('module_access') !== 'Configuration') {
    window.location.href = 'index.html';
    return;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const currentEmail = sessionStorage.getItem('email') || '';
    const tableName    = 'ewell';

    // → Move 'area' before 'tvd' and 'md' so columns align correctly
    const fields = [
      'entity_id','name','start_date','end_date',
      'ddate','cdate','todate','welltype',
      'method','area','tvd','md','comment'
    ];

    let entries = [];
    let sortOrders = [];
    const filters = {};
    fields.forEach(f => filters[f] = { op: '', val: '' });

    const form  = document.getElementById('ewellForm');
    const tbody = document.getElementById('ewellTableBody');
    const ths   = Array.from(document.querySelectorAll('thead .title-row th'));

    // ─── Load lookup dropdowns (entity, welltype, method, area) ─────────
    async function loadLookups() {
      const lookups = [
        { table: 'entity',   key: 'entity_id', form: '#entityInput',    filter: '#val-entity_id', label: 'name'  },
        { table: 'ewtype',   key: 'welltype',  form: '#wellType',      filter: '#val-welltype', label: 'value' },
        { table: 'emethod',  key: 'method',    form: '#method',        filter: '#val-method',    label: 'value' },
        { table: 'earea',    key: 'area',      form: '#area',          filter: '#val-area',      label: 'value' }
      ];

      const lookupMaps = {};

      for (let lk of lookups) {
        const { data, error } = await sb
          .from(lk.table)
          .select(`id, ${lk.label}`)
          .order(lk.label, { ascending: true });
        if (error) {
          console.error(`Error loading ${lk.table}:`, error);
          continue;
        }

        lookupMaps[lk.key] = data.reduce((map, row) => {
          map[row.id] = row[lk.label];
          return map;
        }, {});

        const formEl   = document.querySelector(lk.form);
        const filterEl = document.querySelector(lk.filter);

        formEl.innerHTML   = '<option value="">-- Select --</option>';
        filterEl.innerHTML = '<option value="">All</option>';

        data.forEach(item => {
          formEl.append(new Option(item[lk.label], item.id));
          filterEl.append(new Option(item[lk.label], item.id));
        });

        filterEl.onchange = () => {
          filters[lk.key] = { op: '=', val: filterEl.value };
          renderTable();
        };
      }

      window.__lookupMaps = lookupMaps;
    }

    // ─── Realtime subscription ───────────────────────────────────────────
    await sb
      .channel(`public:${tableName}`)
      .on(
        'postgres_changes',
        { event: ['INSERT','UPDATE','DELETE'], schema: 'public', table: tableName },
        ({ eventType, new: nw, old }) => {
          if (eventType === 'INSERT')  entries.unshift(nw);
          if (eventType === 'UPDATE')  entries = entries.map(r => r.id === nw.id ? nw : r);
          if (eventType === 'DELETE')  entries = entries.filter(r => r.id !== old.id);
          renderTable();
        }
      )
      .subscribe();

    async function loadEntries() {
      const { data } = await sb
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });
      entries = data || [];
      renderTable();
    }

    // ─── Sorting & filtering bindings ───────────────────────────────────
    ths.forEach(th => {
      const key = th.dataset.key;
      th.addEventListener('click', e => {
        if (['SELECT','INPUT'].includes(e.target.tagName)) return;
        const existing = sortOrders.find(o => o.key === key);
        if (e.shiftKey) existing
          ? existing.asc = !existing.asc
          : sortOrders.push({ key, asc: true });
        else
          sortOrders = existing
            ? [{ key, asc: !existing.asc }]
            : [{ key, asc: true }];
        renderTable();
      });

      const opEl  = th.querySelector('select.op');
      const valEl = th.querySelector('input.filter-input') || th.querySelector('input.date-filter');
      if (opEl)  opEl.onchange  = () => { filters[key].op = opEl.value;  renderTable(); };
      if (valEl) valEl.oninput = () => { filters[key].val = valEl.value; renderTable(); };
    });

    function compare(a, b, key) {
      if (key.includes('date')) return new Date(a||0) - new Date(b||0);
      return (a||'').localeCompare(b||'', undefined, { numeric: true });
    }

    // ─── Render table rows ──────────────────────────────────────────────
    function renderTable() {
      ths.forEach(th => {
        const ind = th.querySelector('.sort-indicator');
        if (ind) ind.textContent = '';
      });

      let data = entries.filter(r => fields.every(key => {
        const { op, val } = filters[key];
        if (!op || val === '') return true;
        const cell = (''+r[key]).toLowerCase(), v = val.toLowerCase();
        switch (op) {
          case 'contains': return cell.includes(v);
          case '=':        return cell === v;
          case '<':        return new Date(r[key]) < new Date(val);
          case '>':        return new Date(r[key]) > new Date(val);
        }
        return true;
      }));

      if (sortOrders.length) {
        data.sort((a, b) => {
          for (let { key, asc } of sortOrders) {
            const cmp = compare(a[key], b[key], key);
            if (cmp) return asc ? cmp : -cmp;
          }
          return 0;
        });
        sortOrders.forEach(({ key, asc }) => {
          const th = ths.find(t => t.dataset.key === key);
          const span = th.querySelector('.sort-indicator') || (() => {
            const s = document.createElement('span');
            s.className = 'sort-indicator';
            th.appendChild(s);
            return s;
          })();
          span.textContent = asc ? '▲' : '▼';
        });
      }

      tbody.innerHTML = '';
      data.forEach(r => {
        const tr = document.createElement('tr');
        fields.forEach(key => {
          const td = document.createElement('td');

          if (r.created_by === currentEmail && ['entity_id','welltype','method','area'].includes(key)) {
            const sel = document.createElement('select');
            sel.className = 'form-pane-select';
            sel.append(new Option('--',''));
            Object.entries(window.__lookupMaps[key]).forEach(([id,name]) => {
              const o = new Option(name, id);
              if (r[key] == id) o.selected = true;
              sel.append(o);
            });
            sel.onchange = async () => {
              const { data: updated, error } = await sb
                .from(tableName)
                .update({ [key]: sel.value || null })
                .eq('id', r.id)
                .select();
              if (!error) {
                entries = entries.map(e => e.id === r.id ? updated[0] : e);
                renderTable();
              }
            };
            td.appendChild(sel);

          } else if (r.created_by === currentEmail && ['name','comment','ddate','cdate','todate','tvd','md'].includes(key)) {
            td.contentEditable = true;
            td.textContent = r[key] || '';
            td.onblur = async () => {
              const val = td.textContent.trim() || null;
              if (val !== r[key]) {
                const { data: updated, error } = await sb
                  .from(tableName)
                  .update({ [key]: val })
                  .eq('id', r.id)
                  .select();
                if (!error) {
                  entries = entries.map(e => e.id === r.id ? updated[0] : e);
                  renderTable();
                }
              }
            };

          } else {
            let txt = r[key] !== null ? r[key] : '';
            if (window.__lookupMaps[key] && r[key] !== null) {
              txt = window.__lookupMaps[key][r[key]] || txt;
            } else if (key.includes('date') && txt) {
              txt = new Date(txt).toLocaleDateString();
            }
            td.textContent = txt;
          }

          tr.appendChild(td);
        });

        const ac = document.createElement('td');
        if (r.created_by === currentEmail) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = 'Delete';
          btn.onclick = async () => {
            await sb.from(tableName).delete().eq('id', r.id);
            entries = entries.filter(e => e.id !== r.id);
            renderTable();
          };
          ac.appendChild(btn);
        }
        tr.appendChild(ac);
        tbody.appendChild(tr);
      });
    }

    // ─── Form submission ────────────────────────────────────────────────
    form.addEventListener('submit', async e => {
      e.preventDefault();

      // map field keys to actual element IDs
      const idMap = {
        entity_id:  'entityInput',
        name:       'wellName',
        start_date: 'startDate',
        end_date:   'endDate',
        todate:     'toDate',
        welltype:   'wellType'
      };

      const payload = { created_by: currentEmail };
      fields.forEach(key => {
        const elId = idMap[key] || key;
        const el = document.getElementById(elId);
        if (!el) {
          console.warn(`Skipping missing field element for "${key}" (tried id="${elId}")`);
          return;
        }
        let v = el.value || null;
        if (key.includes('date') && v) {
          v = new Date(v).toISOString().split('T')[0];
        }
        payload[key] = v;
      });

      const { data, error } = await sb.from(tableName).insert([payload]).select();
      if (error) {
        console.error('Insert error:', error);
      } else {
        entries.unshift(data[0]);
        renderTable();
        form.reset();
      }
    });

    // ─── Initialize ─────────────────────────────────────────────────────
    await loadLookups();
    await loadEntries();
  });
})();
