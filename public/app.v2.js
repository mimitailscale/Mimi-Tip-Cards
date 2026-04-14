const techList = document.getElementById('tech-list');
const statusEl = document.getElementById('status');

const csvUrl = (window.APP_CONFIG && window.APP_CONFIG.googleSheetCsvUrl) || '';
const fallbackCsvUrl = 'technicians.csv?v=20260412a';
const hiddenTechnicianIds = new Set(['tiffany']);
let technicians = [];
let selectedTechId = '';

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#9e1a1a' : '#4f4b45';
  statusEl.classList.toggle('show', Boolean(message));
}

function toSlug(value) {
  return (
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tech'
  );
}

function parseCsvRow(row) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

async function loadFromGoogleSheet(url) {
  const response = await fetch(url, { headers: { Accept: 'text/csv' } });
  if (!response.ok) {
    throw new Error(`Failed to load Google Sheet (HTTP ${response.status})`);
  }

  const text = await response.text();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const normalizeHeaderCell = (cell) =>
    cell
      .replace(/^\uFEFF/, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');

  const nameAliases = ['name', 'technician', 'tech', 'staff', 'staffname', 'technicianname'];

  let headerLineIndex = -1;
  let header = [];
  for (let i = 0; i < lines.length; i += 1) {
    const cells = parseCsvRow(lines[i]).map(normalizeHeaderCell);
    if (cells.some((h) => nameAliases.includes(h))) {
      headerLineIndex = i;
      header = cells;
      break;
    }
  }

  if (headerLineIndex === -1) {
    throw new Error('Google Sheet must include a name column.');
  }

  const idx = {
    id: header.indexOf('id'),
    name: header.findIndex((h) => nameAliases.includes(h)),
    venmo: header.indexOf('venmo'),
    cashApp: header.findIndex((h) => h === 'cashapp' || h === 'cash' || h === 'cashappurl')
  };

  const rows = [];
  for (let i = headerLineIndex + 1; i < lines.length; i += 1) {
    const row = parseCsvRow(lines[i]);
    const name = (row[idx.name] || '').trim();
    if (!name) continue;

    rows.push({
      id: (idx.id >= 0 ? row[idx.id] : '')?.trim() || toSlug(name),
      name,
      venmo: (idx.venmo >= 0 ? row[idx.venmo] : '')?.trim() || '',
      cashApp: (idx.cashApp >= 0 ? row[idx.cashApp] : '')?.trim() || ''
    });
  }

  const used = new Set();
  return rows
    .map((tech) => {
      let id = tech.id || toSlug(tech.name);
      let n = 2;
      while (used.has(id)) {
        id = `${toSlug(tech.name)}-${n}`;
        n += 1;
      }
      used.add(id);
      return { ...tech, id };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function loadFromFallbackCsv() {
  const response = await fetch(fallbackCsvUrl, { headers: { Accept: 'text/csv' } });
  if (!response.ok) {
    throw new Error(`Fallback CSV missing (HTTP ${response.status})`);
  }
  const text = await response.text();
  return loadFromGoogleSheet(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`);
}

async function loadFromApi() {
  const response = await fetch('/api/technicians', {
    headers: { 'Content-Type': 'application/json' }
  });

  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(payload.message || 'Failed to load technicians');
  }

  return Array.isArray(payload) ? payload : [];
}

function mergeTechnicians(primaryList, fallbackList) {
  const seen = new Set(primaryList.map((tech) => tech.id || toSlug(tech.name)));
  const missing = fallbackList.filter((tech) => {
    const id = tech.id || toSlug(tech.name);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return [...primaryList, ...missing].sort((a, b) => a.name.localeCompare(b.name));
}

function removeHiddenTechnicians(list) {
  return list.filter((tech) => !hiddenTechnicianIds.has(tech.id || toSlug(tech.name)));
}

function renderTechnicianList() {
  const previous = selectedTechId;
  techList.innerHTML = '';

  technicians.forEach((tech) => {
    const item = document.createElement('div');
    item.className = 'tech-item';
    item.dataset.id = tech.id;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tech-name-btn';
    btn.textContent = tech.name;
    btn.dataset.id = tech.id;
    btn.addEventListener('click', () => {
      selectedTechId = tech.id;
      updateActions();
    });
    item.appendChild(btn);
    techList.appendChild(item);
  });

  if (technicians.some((tech) => tech.id === previous)) {
    selectedTechId = previous;
  } else {
    selectedTechId = '';
  }

  updateActions();
}

function updateActions() {
  const selectedTech = technicians.find((tech) => tech.id === selectedTechId);

  techList.querySelectorAll('.tech-item').forEach((item) => {
    const btn = item.querySelector('.tech-name-btn');
    const isActive = btn.dataset.id === selectedTechId;
    btn.classList.toggle('active', isActive);
    item.classList.toggle('active-tech', isActive);

    const oldInline = item.querySelector('.inline-actions');
    if (oldInline) oldInline.remove();
  });

  if (!selectedTech) {
    setStatus('');
    return;
  }

  const hasVenmo = Boolean(selectedTech.venmo);
  const hasCashApp = Boolean(selectedTech.cashApp);

  if (!hasVenmo && !hasCashApp) {
    setStatus(`No tip links are configured for ${selectedTech.name}.`, true);
    return;
  }

  const selectedItem = techList.querySelector(`.tech-item[data-id="${selectedTechId}"]`);
  if (!selectedItem) return;

  const inline = document.createElement('div');
  inline.className = 'inline-actions';

  const heading = document.createElement('div');
  heading.className = 'tip-heading';
  heading.textContent = `Tip ${selectedTech.name}`;
  inline.appendChild(heading);

  const buttons = document.createElement('div');
  buttons.className = 'buttons';

  if (hasVenmo) {
    const v = document.createElement('a');
    v.className = 'btn venmo';
    v.target = '_blank';
    v.rel = 'noopener noreferrer';
    v.href = selectedTech.venmo;
    v.textContent = 'Tip with Venmo';
    buttons.appendChild(v);
  }

  if (hasCashApp) {
    const c = document.createElement('a');
    c.className = 'btn cashapp';
    c.target = '_blank';
    c.rel = 'noopener noreferrer';
    c.href = selectedTech.cashApp;
    c.textContent = 'Tip with Cash App';
    buttons.appendChild(c);
  }

  inline.appendChild(buttons);
  selectedItem.appendChild(inline);

  setStatus('');
}

async function loadTechnicians() {
  try {
    setStatus('Loading technicians...');
    if (csvUrl) {
      try {
        const sheetTechnicians = await loadFromGoogleSheet(csvUrl);
        const fallbackTechnicians = await loadFromFallbackCsv().catch(() => []);
        technicians = removeHiddenTechnicians(
          mergeTechnicians(sheetTechnicians, fallbackTechnicians)
        );
      } catch (sheetError) {
        technicians = removeHiddenTechnicians(await loadFromFallbackCsv());
        setStatus(
          'Loaded local backup list. Google Sheet may be blocked by browser/network.',
          true
        );
      }
    } else {
      technicians = removeHiddenTechnicians(await loadFromApi());
    }

    renderTechnicianList();
    if (!technicians.length) {
      setStatus('No technicians are configured yet.');
      return;
    }
    setStatus('');
  } catch (error) {
    setStatus(error.message || 'Unable to load technician list right now.', true);
  }
}

loadTechnicians();
