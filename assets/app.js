const STORAGE_KEY = "ncea_enrollments_v1";

function nowISO() {
  const d = new Date();
  return d.toISOString();
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-PT", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  } catch { return iso; }
}

function loadEnrollments() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) || []; } catch { return []; }
}

function saveEnrollments(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function addEnrollment(data) {
  const list = loadEnrollments();
  list.unshift(data);
  saveEnrollments(list);
  return list.length;
}

function removeEnrollment(id) {
  const list = loadEnrollments().filter(x => x.id !== id);
  saveEnrollments(list);
  return list;
}

function clearAllEnrollments() {
  localStorage.removeItem(STORAGE_KEY);
}

function toCSV(rows) {
  const headers = ["Data","Curso","Nome","Telefone","Distrito","Email","Observacoes","ID"];
  const esc = (v) => `"${String(v ?? "").replaceAll('"','""')}"`;
  const lines = [headers.map(esc).join(",")];

  for (const r of rows) {
    lines.push([
      formatDate(r.createdAt),
      r.course,
      r.fullname,
      r.phone,
      r.district,
      r.email,
      r.note,
      r.id
    ].map(esc).join(","));
  }
  return lines.join("\n");
}

function download(filename, content, type="text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Index page ----------
(function initIndex(){
  const form = document.getElementById("enrollForm");
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  if (!form) return;

  const status = document.getElementById("status");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);

    const payload = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + "_" + Math.random().toString(16).slice(2),
      createdAt: nowISO(),
      course: String(fd.get("course") || "").trim(),
      fullname: String(fd.get("fullname") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      district: String(fd.get("district") || "").trim(),
      occupation: String(fd.get("occupation") || "").trim(),
      note: String(fd.get("note") || "").trim(),
    };

    // validação simples
    if (!payload.course || !payload.fullname || !payload.phone || !payload.district) {
      if (status) status.textContent = "Por favor, preencha os campos obrigatórios.";
      return;
    }

    addEnrollment(payload);
    if (status) status.textContent = "Inscrição submetida com sucesso. Entraremos em contacto.";
    form.reset();
  });
})();

// ---------- Admin page ----------
(function initAdmin(){
  const tbody = document.getElementById("tbody");
  if (!tbody) return;

  const count = document.getElementById("count");
  const search = document.getElementById("search");
  const exportCsvBtn = document.getElementById("exportCsv");
  const clearAllBtn = document.getElementById("clearAll");
  const adminStatus = document.getElementById("adminStatus");

  function render(filterText="") {
    const list = loadEnrollments();
    const q = (filterText || "").toLowerCase().trim();

    const filtered = q
      ? list.filter(r =>
          (r.fullname||"").toLowerCase().includes(q) ||
          (r.course||"").toLowerCase().includes(q) ||
          (r.phone||"").toLowerCase().includes(q) ||
          (r.district||"").toLowerCase().includes(q) ||
          (r.email||"").toLowerCase().includes(q)
        )
      : list;

    tbody.innerHTML = "";
    for (const r of filtered) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatDate(r.createdAt)}</td>
        <td>${escapeHtml(r.course)}</td>
        <td>${escapeHtml(r.fullname)}</td>
        <td>${escapeHtml(r.phone)}</td>
        <td>${escapeHtml(r.district)}</td>
        <td>${escapeHtml(r.email || "")}</td>
        <td>${escapeHtml(r.note || "")}</td>
        <td><button class="btn danger" data-id="${r.id}">Remover</button></td>
      `;
      tbody.appendChild(tr);
    }

    if (count) count.textContent = String(list.length);
    if (adminStatus) adminStatus.textContent = filtered.length === 0 ? "Sem inscrições para mostrar." : "";
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    removeEnrollment(id);
    render(search?.value || "");
  });

  search?.addEventListener("input", () => render(search.value));

  exportCsvBtn?.addEventListener("click", () => {
    const list = loadEnrollments();
    if (list.length === 0) {
      if (adminStatus) adminStatus.textContent = "Não há dados para exportar.";
      return;
    }
    const csv = toCSV(list);
    download("inscricoes_ncea.csv", csv, "text/csv;charset=utf-8");
  });

  clearAllBtn?.addEventListener("click", () => {
    const ok = confirm("Tem a certeza que deseja apagar todas as inscrições deste dispositivo?");
    if (!ok) return;
    clearAllEnrollments();
    render(search?.value || "");
  });

  render();
})();
