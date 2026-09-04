function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const colors = { success: 'bg-emerald-500', error: 'bg-rose-500', info: 'bg-blue-500' };
  const toast = document.createElement('div');
  toast.className = `${colors[type]} text-white rounded-xl shadow-lg px-4 py-3 font-bold text-sm`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showLoading(msg = 'กำลังประมวลผล...') {
  document.getElementById('loading-text').innerText = msg;
  document.getElementById('loading-overlay').classList.remove('hidden');
  document.getElementById('loading-overlay').classList.add('flex');
}
function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
  document.getElementById('loading-overlay').classList.remove('flex');
}

let adminToken = sessionStorage.getItem('adminToken') || null;

async function callAdminApi(action, collection, id = null, data = null) {
  const res = await fetch('/api/admin-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: adminToken, action, collection, id, data })
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'เกิดข้อผิดพลาด');
  return result;
}

if (adminToken) {
  document.getElementById('login-view').classList.remove('active');
  document.getElementById('dashboard-view').classList.add('active');
  switchModule('foods');
}

document.getElementById('btn-admin-login').onclick = async () => {
  const memberId = document.getElementById('admin-memberid-input').value.trim();
  const password = document.getElementById('admin-password-input').value;
  const errBox = document.getElementById('login-error');
  errBox.classList.add('hidden');

  if (!memberId || !password) {
    errBox.innerText = 'กรุณากรอกรหัสสมาชิกและรหัสผ่านให้ครบ';
    errBox.classList.remove('hidden');
    return;
  }

  showLoading('กำลังเข้าสู่ระบบ...');
  try {
    const res = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, password })
    });
    const result = await res.json();
    hideLoading();

    if (!res.ok) {
      errBox.innerText = result.error || 'เข้าสู่ระบบไม่สำเร็จ';
      errBox.classList.remove('hidden');
      return;
    }

    adminToken = result.token;
    sessionStorage.setItem('adminToken', adminToken);
    document.getElementById('login-view').classList.remove('active');
    document.getElementById('dashboard-view').classList.add('active');
    switchModule('foods');
  } catch (err) {
    hideLoading();
    errBox.innerText = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
    errBox.classList.remove('hidden');
  }
};

document.querySelectorAll('.module-tab').forEach(btn => {
  btn.onclick = () => switchModule(btn.dataset.module);
});

function switchModule(name) {
  document.querySelectorAll('.module-tab').forEach(b => b.className = 'module-tab w-full text-left px-3 py-2.5 rounded-lg mb-1 font-bold text-sm');
  document.querySelector(`[data-module="${name}"]`).className = 'module-tab w-full text-left px-3 py-2.5 rounded-lg mb-1 font-bold text-sm bg-white/10';
  document.querySelectorAll('.module-content').forEach(c => c.classList.add('hidden'));
  document.getElementById(`module-${name}`).classList.remove('hidden');

  if (name === 'foods') loadFoods();
  else if (name === 'events') loadEvents();
}

// ================= เมนูอาหาร =================

let allFoodsData = [];

async function loadFoods() {
  const container = document.getElementById('foods-list');
  container.innerHTML = '<p class="text-gray-400">กำลังโหลด...</p>';
  try {
    const { items } = await callAdminApi('list', 'foods');
    allFoodsData = items;
    container.innerHTML = items.map(f => `
      <div class="bg-white rounded-xl shadow-sm border p-4 cursor-pointer" onclick="openFoodModal('${f.id}')">
        <img src="${f.image || ''}" class="w-full h-32 object-cover rounded-lg mb-2 bg-gray-100">
        <h4 class="font-bold text-gray-800">${f.name}</h4>
        <p class="text-sm text-gray-400 truncate">${f.concept || ''}</p>
      </div>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function arrayToTextarea(arr) { return (arr || []).join('\n'); }
function textareaToArray(text) { return text.split('\n').map(l => l.trim()).filter(l => l); }

function tipsToTextarea(tips) {
  return (tips || []).map(t => `${t.icon}|${t.title}|${t.detail}`).join('\n');
}
function textareaToTips(text) {
  return text.split('\n').map(l => l.trim()).filter(l => l).map(line => {
    const [icon, title, detail] = line.split('|').map(s => s.trim());
    return { icon: icon || '💡', title: title || '', detail: detail || '' };
  });
}

window.openFoodModal = function(id) {
  document.getElementById('food-id').value = id || '';
  if (id) {
    const f = allFoodsData.find(x => x.id === id);
    document.getElementById('food-name').value = f.name || '';
    document.getElementById('food-concept').value = f.concept || '';
    document.getElementById('food-image').value = f.image || '';
    document.getElementById('food-ingredients').value = arrayToTextarea(f.ingredients);
    document.getElementById('food-instructions').value = arrayToTextarea(f.instructions);
    document.getElementById('food-tips').value = tipsToTextarea(f.tips);
    document.getElementById('btn-delete-food').classList.remove('hidden');
  } else {
    ['food-name', 'food-concept', 'food-image', 'food-ingredients', 'food-instructions', 'food-tips'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('btn-delete-food').classList.add('hidden');
  }
  document.getElementById('food-modal').classList.remove('hidden');
  document.getElementById('food-modal').classList.add('flex');
};

document.getElementById('btn-new-food').onclick = () => openFoodModal(null);
document.getElementById('btn-close-food-modal').onclick = () => {
  document.getElementById('food-modal').classList.add('hidden');
  document.getElementById('food-modal').classList.remove('flex');
};

document.getElementById('btn-save-food').onclick = async () => {
  const id = document.getElementById('food-id').value || null;
  const data = {
    name: document.getElementById('food-name').value.trim(),
    concept: document.getElementById('food-concept').value.trim(),
    image: document.getElementById('food-image').value.trim(),
    ingredients: textareaToArray(document.getElementById('food-ingredients').value),
    instructions: textareaToArray(document.getElementById('food-instructions').value),
    tips: textareaToTips(document.getElementById('food-tips').value)
  };

  if (!data.name) { showToast('กรุณากรอกชื่อเมนู', 'error'); return; }

  showLoading('กำลังบันทึก...');
  try {
    await callAdminApi('save', 'foods', id, data);
    hideLoading();
    showToast('บันทึกสำเร็จ!', 'success');
    document.getElementById('btn-close-food-modal').click();
    loadFoods();
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
};

document.getElementById('btn-delete-food').onclick = async () => {
  const id = document.getElementById('food-id').value;
  if (!id || !confirm('ยืนยันลบเมนูนี้?')) return;

  showLoading('กำลังลบ...');
  try {
    await callAdminApi('delete', 'foods', id);
    hideLoading();
    showToast('ลบสำเร็จ!', 'success');
    document.getElementById('btn-close-food-modal').click();
    loadFoods();
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
};

// ================= กิจกรรม =================

let allEventsData = [];
let currentSlots = [];

async function loadEvents() {
  const container = document.getElementById('events-list');
  container.innerHTML = '<p class="text-gray-400">กำลังโหลด...</p>';
  try {
    const { items } = await callAdminApi('list', 'events');
    allEventsData = items;
    container.innerHTML = items.map(e => `
      <div class="bg-white rounded-xl shadow-sm border p-4 cursor-pointer" onclick="openEventModal('${e.id}')">
        <img src="${e.image || ''}" class="w-full h-32 object-cover rounded-lg mb-2 bg-gray-100">
        <h4 class="font-bold text-gray-800">${e.name}</h4>
        <p class="text-sm text-gray-400">${e.province || '-'} · ${(e.slots || []).length} รอบเวลา</p>
      </div>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderSlots() {
  document.getElementById('event-slots-container').innerHTML = currentSlots.map((s, i) => `
    <div class="grid grid-cols-5 gap-1 items-center bg-gray-50 p-2 rounded-lg">
      <input type="date" class="form-input text-xs slot-date" data-i="${i}" value="${s.date || ''}">
      <input type="time" class="form-input text-xs slot-start" data-i="${i}" value="${s.startTime || ''}">
      <input type="time" class="form-input text-xs slot-end" data-i="${i}" value="${s.endTime || ''}">
      <input type="number" class="form-input text-xs slot-seats" data-i="${i}" placeholder="ที่นั่ง" value="${s.totalSeats || ''}">
      <button class="text-red-500 slot-remove" data-i="${i}"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');

  document.querySelectorAll('.slot-date, .slot-start, .slot-end, .slot-seats').forEach(inp => {
    inp.oninput = () => {
      const i = Number(inp.dataset.i);
      if (inp.classList.contains('slot-date')) currentSlots[i].date = inp.value;
      if (inp.classList.contains('slot-start')) currentSlots[i].startTime = inp.value;
      if (inp.classList.contains('slot-end')) currentSlots[i].endTime = inp.value;
      if (inp.classList.contains('slot-seats')) currentSlots[i].totalSeats = Number(inp.value);
    };
  });
  document.querySelectorAll('.slot-remove').forEach(btn => {
    btn.onclick = () => { currentSlots.splice(Number(btn.dataset.i), 1); renderSlots(); };
  });
}

document.getElementById('btn-add-slot').onclick = () => {
  currentSlots.push({ slotId: 'slot' + Date.now(), date: '', startTime: '', endTime: '', totalSeats: 0, bookedSeats: 0 });
  renderSlots();
};

window.openEventModal = function(id) {
  document.getElementById('event-id').value = id || '';
  if (id) {
    const e = allEventsData.find(x => x.id === id);
    document.getElementById('event-name').value = e.name || '';
    document.getElementById('event-category').value = e.category || '';
    document.getElementById('event-province').value = e.province || '';
    document.getElementById('event-image').value = e.image || '';
    document.getElementById('event-description').value = e.description || '';
    document.getElementById('event-location').value = e.location || '';
    document.getElementById('event-minage').value = e.minAge || 0;
    document.getElementById('event-maxage').value = e.maxAge || 0;
    currentSlots = JSON.parse(JSON.stringify(e.slots || []));
    document.getElementById('btn-delete-event').classList.remove('hidden');
  } else {
    ['event-name', 'event-category', 'event-province', 'event-image', 'event-description', 'event-location'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('event-minage').value = 0;
    document.getElementById('event-maxage').value = 0;
    currentSlots = [];
    document.getElementById('btn-delete-event').classList.add('hidden');
  }
  renderSlots();
  document.getElementById('event-modal').classList.remove('hidden');
  document.getElementById('event-modal').classList.add('flex');
};

document.getElementById('btn-new-event').onclick = () => openEventModal(null);
document.getElementById('btn-close-event-modal').onclick = () => {
  document.getElementById('event-modal').classList.add('hidden');
  document.getElementById('event-modal').classList.remove('flex');
};

document.getElementById('btn-save-event').onclick = async () => {
  const id = document.getElementById('event-id').value || null;
  const data = {
    name: document.getElementById('event-name').value.trim(),
    category: document.getElementById('event-category').value.trim(),
    province: document.getElementById('event-province').value.trim(),
    image: document.getElementById('event-image').value.trim(),
    description: document.getElementById('event-description').value.trim(),
    location: document.getElementById('event-location').value.trim(),
    minAge: Number(document.getElementById('event-minage').value) || 0,
    maxAge: Number(document.getElementById('event-maxage').value) || 0,
    slots: currentSlots
  };

  if (!data.name) { showToast('กรุณากรอกชื่อกิจกรรม', 'error'); return; }

  showLoading('กำลังบันทึก...');
  try {
    await callAdminApi('save', 'events', id, data);
    hideLoading();
    showToast('บันทึกสำเร็จ!', 'success');
    document.getElementById('btn-close-event-modal').click();
    loadEvents();
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
};

document.getElementById('btn-delete-event').onclick = async () => {
  const id = document.getElementById('event-id').value;
  if (!id || !confirm('ยืนยันลบกิจกรรมนี้?')) return;

  showLoading('กำลังลบ...');
  try {
    await callAdminApi('delete', 'events', id);
    hideLoading();
    showToast('ลบสำเร็จ!', 'success');
    document.getElementById('btn-close-event-modal').click();
    loadEvents();
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
};