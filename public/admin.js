const addForm = document.getElementById('add-form');
const newNameInput = document.getElementById('new-name');
const newVenmoInput = document.getElementById('new-venmo');
const newCashAppInput = document.getElementById('new-cashapp');
const manageList = document.getElementById('manage-list');
const manageStatusEl = document.getElementById('manage-status');

let technicians = [];

function setManageStatus(message, isError = false) {
  manageStatusEl.textContent = message;
  manageStatusEl.style.color = isError ? '#9e1a1a' : '#4f4b45';
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'Request failed');
  }

  return payload;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderManageList() {
  manageList.innerHTML = '';

  if (!technicians.length) {
    manageList.innerHTML = '<p>No technicians yet.</p>';
    return;
  }

  technicians.forEach((tech) => {
    const item = document.createElement('form');
    item.className = 'manage-item';

    item.innerHTML = `
      <input type="text" name="name" value="${escapeHtml(tech.name)}" required />
      <input type="url" name="venmo" placeholder="Venmo link" value="${escapeHtml(tech.venmo || '')}" />
      <input type="url" name="cashApp" placeholder="Cash App link" value="${escapeHtml(tech.cashApp || '')}" />
      <div class="manage-actions">
        <button type="submit" class="save-btn">Save</button>
        <button type="button" class="remove-btn">Remove</button>
      </div>
    `;

    item.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(item);

      try {
        setManageStatus('Saving...');
        technicians = await api(`/api/technicians/${encodeURIComponent(tech.id)}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: String(formData.get('name') || '').trim(),
            venmo: String(formData.get('venmo') || '').trim(),
            cashApp: String(formData.get('cashApp') || '').trim()
          })
        });
        renderManageList();
        setManageStatus('Technician updated.');
      } catch (error) {
        setManageStatus(error.message, true);
      }
    });

    const removeBtn = item.querySelector('.remove-btn');
    removeBtn.addEventListener('click', async () => {
      const ok = window.confirm(`Remove ${tech.name}?`);
      if (!ok) return;

      try {
        setManageStatus('Removing...');
        technicians = await api(`/api/technicians/${encodeURIComponent(tech.id)}`, {
          method: 'DELETE'
        });
        renderManageList();
        setManageStatus('Technician removed.');
      } catch (error) {
        setManageStatus(error.message, true);
      }
    });

    manageList.appendChild(item);
  });
}

async function loadTechnicians() {
  try {
    setManageStatus('Loading technicians...');
    technicians = await api('/api/technicians');
    renderManageList();
    setManageStatus('Directory loaded.');
  } catch (_error) {
    setManageStatus('Unable to load technician list right now.', true);
  }
}

addForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    name: newNameInput.value.trim(),
    venmo: newVenmoInput.value.trim(),
    cashApp: newCashAppInput.value.trim()
  };

  if (!payload.name) {
    setManageStatus('Technician name is required.', true);
    return;
  }

  try {
    setManageStatus('Adding...');
    technicians = await api('/api/technicians', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    addForm.reset();
    renderManageList();
    setManageStatus('Technician added.');
  } catch (error) {
    setManageStatus(error.message, true);
  }
});

loadTechnicians();
