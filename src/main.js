// ============================================================
// ฟังก์ชันพื้นฐาน (Toast, Loading)
// ============================================================

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

// ============================================================
// Login + API กลาง
// ============================================================

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

async function callOrgInfoApi(action, data = null) {
  const res = await fetch('/api/admin-orginfo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: adminToken, action, data })
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'เกิดข้อผิดพลาด');
  return result;
}

async function uploadImageToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'goodday_unsigned');

  const res = await fetch('https://api.cloudinary.com/v1_1/l1htg1ks/image/upload', {
    method: 'POST', body: formData
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error('อัปโหลดรูปไม่สำเร็จ');
  return data.secure_url;
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

// ============================================================
// สลับโมดูล
// ============================================================

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
  else if (name === 'orginfo') loadOrgInfo();
  else if (name === 'faqs') loadFaqs();
  else if (name === 'shops') loadShops();
  else if (name === 'products') loadProducts();
}

// ============================================================
// เมนูอาหาร
// ============================================================

let allFoodsData = [];

function arrayToTextarea(arr) { return (arr || []).join('\n'); }
function textareaToArray(text) { return text.split('\n').map(l => l.trim()).filter(l => l); }
function tipsToTextarea(tips) { return (tips || []).map(t => `${t.icon}|${t.title}|${t.detail}`).join('\n'); }
function textareaToTips(text) {
  return text.split('\n').map(l => l.trim()).filter(l => l).map(line => {
    const [icon, title, detail] = line.split('|').map(s => s.trim());
    return { icon: icon || '💡', title: title || '', detail: detail || '' };
  });
}

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

// ============================================================
// กิจกรรม
// ============================================================

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

// ============================================================
// รู้จักเรา (orgInfo)
// ============================================================

async function loadOrgInfo() {
  try {
    const { data } = await callOrgInfoApi('get');
    document.getElementById('org-name').value = data.name || '';
    document.getElementById('org-description').value = data.description || '';
    document.getElementById('org-logo').value = data.logoUrl || '';
    document.getElementById('org-phone').value = data.phone || '';
    document.getElementById('org-coordinator').value = data.coordinatorName || '';
    document.getElementById('org-email').value = data.email || '';

    const socials = data.socialLinks || {};
    document.getElementById('org-instagram').value = socials.instagram || '';
    document.getElementById('org-facebook').value = socials.facebook || '';
    document.getElementById('org-tiktok').value = socials.tiktok || '';
    document.getElementById('org-youtube').value = socials.youtube || '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('btn-save-orginfo').onclick = async () => {
  const data = {
    name: document.getElementById('org-name').value.trim(),
    description: document.getElementById('org-description').value.trim(),
    logoUrl: document.getElementById('org-logo').value.trim(),
    phone: document.getElementById('org-phone').value.trim(),
    coordinatorName: document.getElementById('org-coordinator').value.trim(),
    email: document.getElementById('org-email').value.trim(),
    socialLinks: {
      instagram: document.getElementById('org-instagram').value.trim(),
      facebook: document.getElementById('org-facebook').value.trim(),
      tiktok: document.getElementById('org-tiktok').value.trim(),
      youtube: document.getElementById('org-youtube').value.trim()
    }
  };

  showLoading('กำลังบันทึก...');
  try {
    await callOrgInfoApi('save', data);
    hideLoading();
    showToast('บันทึกข้อมูลสำเร็จ!', 'success');
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
};

// ============================================================
// คำถามที่พบบ่อย (FAQ)
// ============================================================

let allFaqsData = [];

async function loadFaqs() {
  const container = document.getElementById('faqs-list');
  container.innerHTML = '<p class="text-gray-400">กำลังโหลด...</p>';
  try {
    const { items } = await callAdminApi('list', 'faqs');
    allFaqsData = items.sort((a, b) => (a.order || 0) - (b.order || 0));
    container.innerHTML = allFaqsData.map(f => `
      <div class="bg-white rounded-xl shadow-sm border p-4 cursor-pointer flex justify-between items-center" onclick="openFaqModal('${f.id}')">
        <div>
          <p class="text-xs text-gray-400 font-bold">ลำดับ ${f.order || '-'}</p>
          <h4 class="font-bold text-gray-800">${f.question}</h4>
        </div>
        <i class="fa-solid fa-chevron-right text-gray-300"></i>
      </div>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.openFaqModal = function(id) {
  document.getElementById('faq-id').value = id || '';
  if (id) {
    const f = allFaqsData.find(x => x.id === id);
    document.getElementById('faq-question').value = f.question || '';
    document.getElementById('faq-answer').value = f.answer || '';
    document.getElementById('faq-order').value = f.order || '';
    document.getElementById('btn-delete-faq').classList.remove('hidden');
  } else {
    document.getElementById('faq-question').value = '';
    document.getElementById('faq-answer').value = '';
    document.getElementById('faq-order').value = allFaqsData.length + 1;
    document.getElementById('btn-delete-faq').classList.add('hidden');
  }
  document.getElementById('faq-modal').classList.remove('hidden');
  document.getElementById('faq-modal').classList.add('flex');
};

document.getElementById('btn-new-faq').onclick = () => openFaqModal(null);
document.getElementById('btn-close-faq-modal').onclick = () => {
  document.getElementById('faq-modal').classList.add('hidden');
  document.getElementById('faq-modal').classList.remove('flex');
};

document.getElementById('btn-save-faq').onclick = async () => {
  const id = document.getElementById('faq-id').value || null;
  const data = {
    question: document.getElementById('faq-question').value.trim(),
    answer: document.getElementById('faq-answer').value.trim(),
    order: Number(document.getElementById('faq-order').value) || 0
  };

  if (!data.question || !data.answer) { showToast('กรุณากรอกคำถามและคำตอบ', 'error'); return; }

  showLoading('กำลังบันทึก...');
  try {
    await callAdminApi('save', 'faqs', id, data);
    hideLoading();
    showToast('บันทึกสำเร็จ!', 'success');
    document.getElementById('btn-close-faq-modal').click();
    loadFaqs();
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
};

document.getElementById('btn-delete-faq').onclick = async () => {
  const id = document.getElementById('faq-id').value;
  if (!id || !confirm('ยืนยันลบคำถามนี้?')) return;

  showLoading('กำลังลบ...');
  try {
    await callAdminApi('delete', 'faqs', id);
    hideLoading();
    showToast('ลบสำเร็จ!', 'success');
    document.getElementById('btn-close-faq-modal').click();
    loadFaqs();
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
};

// ============================================================
// ร้านค้า (พร้อมอัปโหลดรูป)
// ============================================================

let allShopsData = [];
let selectedShopImageFile = null;

async function loadShops() {
  const container = document.getElementById('shops-list');
  container.innerHTML = '<p class="text-gray-400">กำลังโหลด...</p>';
  try {
    const { items } = await callAdminApi('list', 'shops');
    allShopsData = items;
    container.innerHTML = items.map(s => `
      <div class="bg-white rounded-xl shadow-sm border p-4 cursor-pointer" onclick="openShopModal('${s.id}')">
        <img src="${s.logoUrl || ''}" class="w-full h-32 object-cover rounded-lg mb-2 bg-gray-100">
        <h4 class="font-bold text-gray-800">${s.name}</h4>
        <p class="text-sm text-gray-400 truncate mb-2">${s.description || ''}</p>
        <p class="text-xs text-gray-400"><i class="fa-solid fa-star text-amber-400"></i> ${(s.rating || 0).toFixed(1)} · ${s.followerCount || 0} ผู้ติดตาม</p>
      </div>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('shop-image-preview-box').onclick = () => {
  document.getElementById('shop-image-input').click();
};
document.getElementById('shop-image-input').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedShopImageFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('shop-image-preview').src = ev.target.result;
    document.getElementById('shop-image-preview').classList.remove('hidden');
    document.getElementById('shop-image-placeholder').classList.add('hidden');
  };
  reader.readAsDataURL(file);
};

window.openShopModal = function(id) {
  document.getElementById('shop-id').value = id || '';
  selectedShopImageFile = null;

  if (id) {
    const s = allShopsData.find(x => x.id === id);
    document.getElementById('shop-name').value = s.name || '';
    document.getElementById('shop-description').value = s.description || '';
    document.getElementById('shop-owner').value = s.ownerUid || '';
    document.getElementById('shop-promptpay').value = s.promptpayId || '';
    document.getElementById('shop-bankname').value = s.bankName || '';
    document.getElementById('shop-bankaccount').value = s.bankAccountNumber || '';
    document.getElementById('shop-bankname-owner').value = s.bankAccountName || '';

    if (s.logoUrl) {
      document.getElementById('shop-image-preview').src = s.logoUrl;
      document.getElementById('shop-image-preview').classList.remove('hidden');
      document.getElementById('shop-image-placeholder').classList.add('hidden');
    } else {
      document.getElementById('shop-image-preview').classList.add('hidden');
      document.getElementById('shop-image-placeholder').classList.remove('hidden');
    }
    document.getElementById('btn-delete-shop').classList.remove('hidden');
  } else {
    ['shop-name', 'shop-description', 'shop-owner', 'shop-promptpay', 'shop-bankname', 'shop-bankaccount', 'shop-bankname-owner'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('shop-image-preview').classList.add('hidden');
    document.getElementById('shop-image-placeholder').classList.remove('hidden');
    document.getElementById('btn-delete-shop').classList.add('hidden');
  }
  document.getElementById('shop-modal').classList.remove('hidden');
  document.getElementById('shop-modal').classList.add('flex');
};

document.getElementById('btn-new-shop').onclick = () => openShopModal(null);
document.getElementById('btn-close-shop-modal').onclick = () => {
  document.getElementById('shop-modal').classList.add('hidden');
  document.getElementById('shop-modal').classList.remove('flex');
};

document.getElementById('btn-save-shop').onclick = async () => {
  const id = document.getElementById('shop-id').value || null;
  const data = {
    name: document.getElementById('shop-name').value.trim(),
    description: document.getElementById('shop-description').value.trim(),
    ownerUid: document.getElementById('shop-owner').value.trim(),
    promptpayId: document.getElementById('shop-promptpay').value.trim(),
    bankName: document.getElementById('shop-bankname').value.trim(),
    bankAccountNumber: document.getElementById('shop-bankaccount').value.trim(),
    bankAccountName: document.getElementById('shop-bankname-owner').value.trim()
  };

  if (!id) { data.rating = 0; data.ratingCount = 0; data.followerCount = 0; }
  if (!data.name) { showToast('กรุณากรอกชื่อร้าน', 'error'); return; }

  showLoading('กำลังบันทึก...');
  try {
    if (selectedShopImageFile) {
      showLoading('กำลังอัปโหลดรูป...');
      data.logoUrl = await uploadImageToCloudinary(selectedShopImageFile);
      showLoading('กำลังบันทึก...');
    }

    await callAdminApi('save', 'shops', id, data);
    hideLoading();
    showToast('บันทึกสำเร็จ!', 'success');
    document.getElementById('btn-close-shop-modal').click();
    loadShops();
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
};

document.getElementById('btn-delete-shop').onclick = async () => {
  const id = document.getElementById('shop-id').value;
  if (!id || !confirm('ยืนยันลบร้านนี้? สินค้าในร้านจะไม่ถูกลบอัตโนมัติ')) return;

  showLoading('กำลังลบ...');
  try {
    await callAdminApi('delete', 'shops', id);
    hideLoading();
    showToast('ลบสำเร็จ!', 'success');
    document.getElementById('btn-close-shop-modal').click();
    loadShops();
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
};

// ============================================================
// สินค้า (พร้อมอัปโหลดรูป)
// ============================================================

let allProductsData = [];
let selectedProductImageFile = null;

function fillShopDropdowns() {
  const options = allShopsData.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  document.getElementById('product-shop').innerHTML = '<option value="">-- เลือกร้านค้า --</option>' + options;
  document.getElementById('product-shop-filter').innerHTML = '<option value="">ทุกร้านค้า</option>' + options;
}

async function loadProducts() {
  const container = document.getElementById('products-list');
  container.innerHTML = '<p class="text-gray-400">กำลังโหลด...</p>';
  try {
    if (allShopsData.length === 0) {
      const { items } = await callAdminApi('list', 'shops');
      allShopsData = items;
    }
    fillShopDropdowns();

    const { items } = await callAdminApi('list', 'products');
    allProductsData = items;
    renderProductsList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderProductsList() {
  const filterShopId = document.getElementById('product-shop-filter').value;
  const filtered = filterShopId ? allProductsData.filter(p => p.shopId === filterShopId) : allProductsData;

  document.getElementById('products-list').innerHTML = filtered.map(p => {
    const shop = allShopsData.find(s => s.id === p.shopId);
    return `
      <div class="bg-white rounded-xl shadow-sm border p-4 cursor-pointer" onclick="openProductModal('${p.id}')">
        <img src="${p.imageUrl || ''}" class="w-full h-32 object-cover rounded-lg mb-2 bg-gray-100">
        <h4 class="font-bold text-gray-800">${p.name}</h4>
        <p class="text-sm text-gray-400 mb-1">${shop ? shop.name : 'ไม่พบร้าน'}</p>
        <p class="text-lg font-black text-purple-600">฿${(p.price || 0).toLocaleString()}</p>
        <p class="text-xs text-gray-400">สต็อก ${p.stock || 0} · ขายแล้ว ${p.sold || 0} ${p.isFeatured ? '· <span class="text-amber-500 font-bold">แนะนำ</span>' : ''}</p>
      </div>`;
  }).join('');
}

document.getElementById('product-shop-filter').onchange = () => renderProductsList();

document.getElementById('product-image-preview-box').onclick = () => {
  document.getElementById('product-image-input').click();
};
document.getElementById('product-image-input').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedProductImageFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('product-image-preview').src = ev.target.result;
    document.getElementById('product-image-preview').classList.remove('hidden');
    document.getElementById('product-image-placeholder').classList.add('hidden');
  };
  reader.readAsDataURL(file);
};

window.openProductModal = function(id) {
  document.getElementById('product-id').value = id || '';
  selectedProductImageFile = null;

  if (id) {
    const p = allProductsData.find(x => x.id === id);
    document.getElementById('product-shop').value = p.shopId || '';
    document.getElementById('product-name').value = p.name || '';
    document.getElementById('product-description').value = p.description || '';
    document.getElementById('product-price').value = p.price || 0;
    document.getElementById('product-stock').value = p.stock || 0;
    document.getElementById('product-variants').value = (p.variants && p.variants[0]) ? p.variants[0].options.join(', ') : '';
    document.getElementById('product-featured').checked = !!p.isFeatured;

    if (p.imageUrl) {
      document.getElementById('product-image-preview').src = p.imageUrl;
      document.getElementById('product-image-preview').classList.remove('hidden');
      document.getElementById('product-image-placeholder').classList.add('hidden');
    } else {
      document.getElementById('product-image-preview').classList.add('hidden');
      document.getElementById('product-image-placeholder').classList.remove('hidden');
    }
    document.getElementById('btn-delete-product').classList.remove('hidden');
  } else {
    document.getElementById('product-shop').value = '';
    ['product-name', 'product-description', 'product-variants'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('product-price').value = 0;
    document.getElementById('product-stock').value = 0;
    document.getElementById('product-featured').checked = false;
    document.getElementById('product-image-preview').classList.add('hidden');
    document.getElementById('product-image-placeholder').classList.remove('hidden');
    document.getElementById('btn-delete-product').classList.add('hidden');
  }
  document.getElementById('product-modal').classList.remove('hidden');
  document.getElementById('product-modal').classList.add('flex');
};

document.getElementById('btn-new-product').onclick = () => openProductModal(null);
document.getElementById('btn-close-product-modal').onclick = () => {
  document.getElementById('product-modal').classList.add('hidden');
  document.getElementById('product-modal').classList.remove('flex');
};

document.getElementById('btn-save-product').onclick = async () => {
  const id = document.getElementById('product-id').value || null;
  const shopId = document.getElementById('product-shop').value;
  const variantText = document.getElementById('product-variants').value.trim();

  const data = {
    shopId,
    name: document.getElementById('product-name').value.trim(),
    description: document.getElementById('product-description').value.trim(),
    price: Number(document.getElementById('product-price').value) || 0,
    stock: Number(document.getElementById('product-stock').value) || 0,
    isFeatured: document.getElementById('product-featured').checked,
    ownerUid: allShopsData.find(s => s.id === shopId)?.ownerUid || ''
  };

  if (variantText) {
    data.variants = [{ name: 'ตัวเลือก', options: variantText.split(',').map(v => v.trim()).filter(v => v) }];
  } else {
    data.variants = [];
  }

  if (!id) { data.sold = 0; data.rating = 0; data.ratingCount = 0; data.likeCount = 0; }
  if (!shopId) { showToast('กรุณาเลือกร้านค้า', 'error'); return; }
  if (!data.name) { showToast('กรุณากรอกชื่อสินค้า', 'error'); return; }

  showLoading('กำลังบันทึก...');
  try {
    if (selectedProductImageFile) {
      showLoading('กำลังอัปโหลดรูป...');
      data.imageUrl = await uploadImageToCloudinary(selectedProductImageFile);
      showLoading('กำลังบันทึก...');
    }

    await callAdminApi('save', 'products', id, data);
    hideLoading();
    showToast('บันทึกสำเร็จ!', 'success');
    document.getElementById('btn-close-product-modal').click();
    loadProducts();
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
};

document.getElementById('btn-delete-product').onclick = async () => {
  const id = document.getElementById('product-id').value;
  if (!id || !confirm('ยืนยันลบสินค้านี้?')) return;

  showLoading('กำลังลบ...');
  try {
    await callAdminApi('delete', 'products', id);
    hideLoading();
    showToast('ลบสำเร็จ!', 'success');
    document.getElementById('btn-close-product-modal').click();
    loadProducts();
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
};