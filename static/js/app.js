// ─── CONFIG ───────────────────────────────────────────────
const ADMIN_PASS = "p12345M6789@10";

// ─── STATE ────────────────────────────────────────────────
let items     = [];
let activeCat = "All";

// ─── DOM REFS ─────────────────────────────────────────────
const mainSite      = document.getElementById("mainSite");
const adminLogin    = document.getElementById("adminLogin");
const adminPanel    = document.getElementById("adminPanel");
const catTabs       = document.getElementById("catTabs");
const menuGrid      = document.getElementById("menuGrid");
const pwInput       = document.getElementById("pwInput");
const loginErr      = document.getElementById("loginErr");
const adminListWrap = document.getElementById("adminListWrap");
const itemCountEl   = document.getElementById("itemCount");
const toastEl       = document.getElementById("toast");
const navPhones     = document.getElementById("navPhones");

// ─── API ──────────────────────────────────────────────────
async function apiFetchMenu() {
  const res = await fetch("/api/menu");
  items = await res.json();
}

async function apiFetchPhones() {
  const res = await fetch("/api/phones");
  return res.json();
}

async function apiAddItem(payload) {
  const res = await fetch("/api/menu", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload)
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error || "Failed to add item");
  }
  return res.json();
}

async function apiDeleteItem(id) {
  const res = await fetch("/api/menu/delete", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ id })
  });
  if (!res.ok) throw new Error("Failed to delete");
}

async function apiSavePhones(phone1, phone2) {
  const res = await fetch("/api/phones", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ phone1, phone2 })
  });
  if (!res.ok) throw new Error("Failed to save phones");
  return res.json();
}

// ─── PHONE NAV RENDER ─────────────────────────────────────
function renderNavPhones(phones) {
  if (!navPhones) return;
  const links = [phones.phone1, phones.phone2]
    .filter(p => p && p.trim())
    .map(p => `
      <a class="nav-phone-link" href="tel:${esc(p.replace(/\s/g, ''))}">
        <span class="nav-phone-icon">📞</span>${esc(p)}
      </a>`)
    .join("");
  navPhones.innerHTML = links;
}

// ─── ROUTING ──────────────────────────────────────────────
function isAdminPath() {
  return window.location.pathname.endsWith("/admin") ||
         window.location.pathname.endsWith("/admin/");
}

function route() {
  if (isAdminPath()) {
    sessionStorage.getItem("ck_admin") === "1" ? showAdmin() : showLogin();
  } else {
    showHome();
  }
}

window.addEventListener("popstate", route);

function goToHome() {
  const base = window.location.pathname.replace(/\/admin\/?$/, "") || "/";
  history.pushState({}, "", base);
  route();
}

// ─── VIEWS ────────────────────────────────────────────────
async function showHome() {
  mainSite.style.display   = "block";
  adminLogin.style.display = "none";
  adminPanel.style.display = "none";
  const [_, phones] = await Promise.all([apiFetchMenu(), apiFetchPhones()]);
  renderNavPhones(phones);
  renderMenu();
}

function showLogin() {
  mainSite.style.display   = "none";
  adminLogin.style.display = "flex";
  adminPanel.style.display = "none";
  pwInput.value        = "";
  loginErr.textContent = "";
  setTimeout(() => pwInput.focus(), 100);
}

async function showAdmin() {
  mainSite.style.display   = "none";
  adminLogin.style.display = "none";
  adminPanel.style.display = "block";
  const [_, phones] = await Promise.all([apiFetchMenu(), apiFetchPhones()]);
  renderAdminList();
  document.getElementById("iPhone1").value = phones.phone1 || "";
  document.getElementById("iPhone2").value = phones.phone2 || "";
}

// ─── AUTH ─────────────────────────────────────────────────
function doLogin() {
  if (pwInput.value === ADMIN_PASS) {
    sessionStorage.setItem("ck_admin", "1");
    showAdmin();
  } else {
    loginErr.textContent = "Incorrect password. Try again.";
    pwInput.value = "";
    pwInput.focus();
  }
}

function doLogout() {
  sessionStorage.removeItem("ck_admin");
  showLogin();
}

// ─── PHONES ───────────────────────────────────────────────
async function savePhones() {
  const p1  = document.getElementById("iPhone1").value.trim();
  const p2  = document.getElementById("iPhone2").value.trim();
  const btn = document.getElementById("btnSavePhones");
  btn.textContent = "Saving…"; btn.disabled = true;
  try {
    await apiSavePhones(p1, p2);
    showToast("✓ Phone numbers saved!");
  } catch (e) {
    showToast("Error: " + e.message);
  } finally {
    btn.textContent = "Save Phone Numbers"; btn.disabled = false;
  }
}

// ─── IMAGE URL PREVIEW ────────────────────────────────────
function initImageUrl() {
  const urlInput    = document.getElementById("iImg");
  const btnPreview  = document.getElementById("btnPreview");
  const previewWrap = document.getElementById("imgPreviewWrap");
  const previewImg  = document.getElementById("imgPreview");
  const removeBtn   = document.getElementById("imgRemoveBtn");
  if (!urlInput) return;

  function showPreview(url) {
    if (!url.trim()) { showToast("Please enter an image URL."); return; }
    previewImg.onerror = () => {
      previewWrap.style.display = "none";
      showToast("❌ Could not load image. Check the URL.");
    };
    previewImg.onload = () => {
      previewWrap.style.display = "block";
    };
    previewImg.src = url.trim();
  }

  btnPreview.addEventListener("click", () => showPreview(urlInput.value));

  // Also preview on Enter key in URL field
  urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); showPreview(urlInput.value); }
  });

  removeBtn.addEventListener("click", () => {
    urlInput.value            = "";
    previewImg.src            = "";
    previewWrap.style.display = "none";
  });
}

// ─── MENU RENDER ──────────────────────────────────────────
function allCats() {
  return ["All", ...new Set(items.map(i => i.cat))];
}

function catEmoji(cat) {
  return { "Fried Rice": "🍳", "Kottu": "🔪", "Others": "🍽️" }[cat] || "🍽️";
}

function renderMenu() {
  catTabs.innerHTML = allCats().map(c =>
    `<button class="cat-btn ${c === activeCat ? "active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`
  ).join("");
  catTabs.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => { activeCat = btn.dataset.cat; renderMenu(); });
  });

  const filtered = activeCat === "All" ? items : items.filter(i => i.cat === activeCat);
  if (filtered.length === 0) {
    menuGrid.innerHTML = `<div class="no-items">No items in this category yet.</div>`;
    return;
  }
  menuGrid.innerHTML = filtered.map(item => {
    const imgHtml = item.img
      ? `<img class="card-img" src="${esc(item.img)}" alt="${esc(item.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : "";
    const fallback = `<div class="card-no-img" style="${item.img ? 'display:none' : ''}">${catEmoji(item.cat)}</div>`;
    return `
      <div class="menu-card">
        ${imgHtml}${fallback}
        <div class="card-body">
          <div class="card-top">
            <div class="card-name">${esc(item.name)}</div>
            <div class="card-price">LKR ${Number(item.price).toLocaleString()}</div>
          </div>
          ${item.desc ? `<div class="card-desc">${esc(item.desc)}</div>` : ""}
          <span class="card-tag">${esc(item.cat)}</span>
        </div>
      </div>`;
  }).join("");
}

// ─── ADMIN LIST ───────────────────────────────────────────
function renderAdminList() {
  itemCountEl.textContent = items.length;
  if (items.length === 0) {
    adminListWrap.innerHTML = `<div class="admin-empty">No menu items yet. Add one above!</div>`;
    return;
  }
  adminListWrap.innerHTML = `
    <table class="admin-table">
      <thead><tr>
        <th>Image</th><th>Name</th><th>Price</th>
        <th>Category</th><th>Description</th><th>Action</th>
      </tr></thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${item.img
              ? `<img class="td-thumb" src="${esc(item.img)}" alt="" onerror="this.style.display='none'">`
              : `<div class="td-no-thumb">${catEmoji(item.cat)}</div>`}</td>
            <td class="td-name">${esc(item.name)}</td>
            <td class="td-price">LKR ${Number(item.price).toLocaleString()}</td>
            <td><span class="td-cat">${esc(item.cat)}</span></td>
            <td style="color:var(--muted);font-size:.78rem;max-width:160px;">${esc(item.desc || "—")}</td>
            <td><button class="btn-del" data-id="${item.id}">Delete</button></td>
          </tr>`).join("")}
      </tbody>
    </table>`;

  adminListWrap.querySelectorAll(".btn-del").forEach(btn => {
    btn.addEventListener("click", () => deleteItem(Number(btn.dataset.id)));
  });
}

// ─── ADD ITEM ─────────────────────────────────────────────
async function addItem() {
  const name  = document.getElementById("iName").value.trim();
  const price = document.getElementById("iPrice").value.trim();
  const cat   = document.getElementById("iCat").value;
  const desc  = document.getElementById("iDesc").value.trim();
  const img   = document.getElementById("iImg").value.trim();

  if (!name)                                        { showToast("Item name is required!");    return; }
  if (!price || isNaN(price) || Number(price) <= 0) { showToast("Enter a valid price!");      return; }
  if (!cat)                                         { showToast("Please select a category!"); return; }

  const btn = document.getElementById("btnAddItem");
  btn.textContent = "Saving…"; btn.disabled = true;

  try {
    const newItem = await apiAddItem({ name, price, cat, desc, img });
    items.push(newItem);
    renderAdminList();

    // Reset form
    document.getElementById("iName").value  = "";
    document.getElementById("iPrice").value = "";
    document.getElementById("iCat").value   = "";
    document.getElementById("iDesc").value  = "";
    document.getElementById("iImg").value   = "";
    document.getElementById("imgPreviewWrap").style.display = "none";
    document.getElementById("imgPreview").src = "";

    showToast("✓ Item added successfully!");
  } catch (err) {
    showToast("Error: " + err.message);
  } finally {
    btn.textContent = "Add to Menu"; btn.disabled = false;
  }
}

// ─── DELETE ───────────────────────────────────────────────
async function deleteItem(id) {
  if (!confirm("Delete this item from the menu?")) return;
  try {
    await apiDeleteItem(id);
    items = items.filter(i => i.id !== id);
    renderAdminList();
    showToast("Item removed.");
  } catch (e) { showToast("Error: " + e.message); }
}

// ─── TOAST ────────────────────────────────────────────────
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2800);
}

// ─── ESCAPE HTML ──────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ─── EVENTS ───────────────────────────────────────────────
document.getElementById("btnLogin").addEventListener("click", doLogin);
document.getElementById("btnBackHome").addEventListener("click", goToHome);
document.getElementById("btnViewSite").addEventListener("click", goToHome);
document.getElementById("btnLogout").addEventListener("click", doLogout);
document.getElementById("btnAddItem").addEventListener("click", addItem);
document.getElementById("btnSavePhones").addEventListener("click", savePhones);
pwInput.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
document.addEventListener("DOMContentLoaded", initImageUrl);

// ─── BOOT ─────────────────────────────────────────────────
route();
