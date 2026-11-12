/* WARD-ED — SecureLock Global | Attendance Register Prototype */
"use strict";

/* ---------------- DATA ---------------- */
const EMPLOYEES = [
  {id:"EMP-1024", name:"John Carter",   dept:"Operations",    checkin:"08:12", checkout:"17:04", status:"Present"},
  {id:"EMP-1025", name:"Sarah Lin",     dept:"Finance",       checkin:"09:31", checkout:"17:00", status:"Late"},
  {id:"EMP-1026", name:"David Osei",    dept:"HR",            checkin:"--",    checkout:"--",    status:"Absent"},
  {id:"EMP-1145", name:"Maya Krishnan", dept:"Finance",       checkin:"--",    checkout:"--",    status:"Absent"},
  {id:"EMP-1182", name:"Tom Becker",    dept:"HR",            checkin:"08:03", checkout:"15:20", status:"Present"},
  {id:"EMP-1201", name:"Anna Petrova",  dept:"Manufacturing", checkin:"07:58", checkout:"17:12", status:"Present"},
  {id:"EMP-1233", name:"Liam O'Connor", dept:"Operations",    checkin:"08:47", checkout:"17:05", status:"Late"},
  {id:"EMP-1278", name:"Grace Adeyemi", dept:"Operations",    checkin:"08:01", checkout:"17:00", status:"Present"},
  {id:"EMP-1302", name:"Noah Kim",      dept:"Finance",       checkin:"08:05", checkout:"17:30", status:"Present"},
  {id:"EMP-1344", name:"Elena Rossi",   dept:"Manufacturing", checkin:"--",    checkout:"--",    status:"Absent"},
  {id:"EMP-1389", name:"Omar Haddad",   dept:"HR",            checkin:"08:20", checkout:"17:02", status:"Present"},
  {id:"EMP-1410", name:"Julia Novak",   dept:"Operations",    checkin:"08:00", checkout:"16:10", status:"Present"},
];

let EXCEPTIONS = [
  {id:"EX-01", emp:"EMP-1024", name:"John Carter",   dept:"Operations",    date:"03 Oct 2026", type:"Late Arrival",    severity:"Medium", status:"Open",      expected:"08:00", actual:"08:42"},
  {id:"EX-02", emp:"EMP-1145", name:"Maya Krishnan", dept:"Finance",       date:"03 Oct 2026", type:"Missing Punch",   severity:"High",   status:"Review",    expected:"08:00", actual:"No record"},
  {id:"EX-03", emp:"EMP-1182", name:"Tom Becker",    dept:"HR",            date:"02 Oct 2026", type:"Early Departure", severity:"Medium", status:"Resolved",  expected:"17:00", actual:"15:20"},
  {id:"EX-04", emp:"EMP-1233", name:"Liam O'Connor", dept:"Operations",    date:"03 Oct 2026", type:"Late Arrival",    severity:"Low",    status:"Review",    expected:"08:00", actual:"08:47"},
  {id:"EX-05", emp:"EMP-1344", name:"Elena Rossi",   dept:"Manufacturing", date:"03 Oct 2026", type:"Absent",          severity:"High",   status:"Open",      expected:"08:00", actual:"No record"},
  {id:"EX-06", emp:"EMP-1201", name:"Anna Petrova",  dept:"Manufacturing", date:"01 Oct 2026", type:"Overtime",        severity:"Low",    status:"Resolved",  expected:"17:00", actual:"20:12"},
];

const WEEK_ATTENDANCE = [92, 95, 94, 96, 91]; // Mon-Fri %
const OVERTIME_BY_DEPT = [
  {dept:"Operations",    hrs:320},
  {dept:"Manufacturing", hrs:245},
  {dept:"Finance",       hrs:102},
  {dept:"HR",            hrs:75},
  {dept:"Other",         hrs:100},
];

/* ---------------- STATE ---------------- */
let currentRole = null;
let currentPage = "dashboard";
let selectedException = null;

const ROLE_TITLES = {hr:"HR Administrator", payroll:"Payroll Officer", manager:"Department Manager", finance:"Finance Analyst"};

const NAV = {
  hr:      ["Dashboard","Employees","Attendance","Exceptions","Reports","Departments","Notifications","Settings"],
  payroll: ["Dashboard","Attendance","Exceptions","Reports"],
  manager: ["Dashboard","Attendance","Exceptions","Reports"],
  finance: ["Dashboard","Reports"],
};

/* ---------------- HELPERS ---------------- */
const $ = s => document.querySelector(s);
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function toast(msg){
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2600);
}
function statCard(label, value, cls="", icon=""){
  return `<div class="stat-card"><div class="stat-label">${label}</div>
    <div class="stat-value ${cls}">${icon?icon+" ":""}${value}</div></div>`;
}
function statusBadge(s){return `<span class="status ${s.toLowerCase()}">${esc(s)}</span>`;}
function lineChartSVG(points, labels, width=560, height=200){
  const pad = 30, max = 100;
  const xs = i => pad + i * (width - 2*pad) / (points.length - 1);
  const ys = v => height - pad - (v / max) * (height - 2*pad);
  const path = points.map((v,i)=>`${i?"L":"M"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  const area = `${path} L${xs(points.length-1)},${height-pad} L${xs(0)},${height-pad} Z`;
  let grid = "";
  [100,95,90,85,80].forEach(v=>{
    grid += `<line x1="${pad}" y1="${ys(v)}" x2="${width-pad}" y2="${ys(v)}" stroke="#e2e8f0"/>
             <text x="${pad-6}" y="${ys(v)+4}" font-size="10" fill="#94a3b8" text-anchor="end">${v}%</text>`;
  });
  let dots = points.map((v,i)=>`<circle cx="${xs(i)}" cy="${ys(v)}" r="4" fill="#2563eb"/>`).join("");
  let lbls = labels.map((l,i)=>`<text x="${xs(i)}" y="${height-pad+16}" font-size="10" fill="#64748b" text-anchor="middle">${l}</text>`).join("");
  return `<svg class="line-chart" viewBox="0 0 ${width} ${height}">${grid}
    <path d="${area}" fill="rgba(37,99,235,.12)"/>
    <path d="${path}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round"/>${dots}${lbls}</svg>`;
}
function exportCSV(rows, filename){
  const csv = rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------- LOGIN ---------------- */
document.querySelectorAll(".role-card").forEach(card=>{
  card.addEventListener("click", ()=>{
    document.querySelectorAll(".role-card").forEach(c=>c.classList.remove("selected"));
    card.classList.add("selected");
    currentRole = card.dataset.role;
    $("#login-btn").disabled = false;
  });
});
$("#login-btn").addEventListener("click", ()=>{
  if(!currentRole) return;
  $("#login-view").classList.add("hidden");
  $("#app-view").classList.remove("hidden");
  $("#sidebar-role").textContent = ROLE_TITLES[currentRole];
  $("#today-chip").textContent = new Date().toLocaleDateString("en-AU",{weekday:"short", day:"numeric", month:"short", year:"numeric"});
  buildNav();
  go("dashboard");
});
$("#logout-btn").addEventListener("click", ()=>{
  $("#app-view").classList.add("hidden");
  $("#login-view").classList.remove("hidden");
  document.querySelectorAll(".role-card").forEach(c=>c.classList.remove("selected"));
  $("#login-btn").disabled = true;
  currentRole = null;
});

/* ---------------- NAV ---------------- */
const PAGE_KEYS = {"Dashboard":"dashboard","Employees":"employees","Attendance":"attendance","Exceptions":"exceptions","Reports":"reports","Departments":"departments","Notifications":"notifications","Settings":"settings"};
const KEY_ICONS = {dashboard:"🏠",employees:"👥",attendance:"🕒",exceptions:"⚠️",reports:"📈",departments:"🏢",notifications:"🔔",settings:"⚙️"};

function buildNav(){
  const nav = $("#side-nav"); nav.innerHTML = "";
  NAV[currentRole].forEach(item=>{
    const key = PAGE_KEYS[item];
    const b = document.createElement("button");
    b.className = "nav-item"; b.dataset.page = key;
    b.innerHTML = `<span>${KEY_ICONS[key]||"•"}</span><span>${item}</span>`;
    b.addEventListener("click", ()=>go(key));
    nav.appendChild(b);
  });
}
function go(page){
  currentPage = page;
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active", n.dataset.page===page));
  $("#page-title").textContent = NAV[currentRole].find(k=>PAGE_KEYS[k]===page) || "Dashboard";
  render();
}

/* ---------------- PAGE RENDERERS ---------------- */
function render(){
  const c = $("#page-content");
  const deptFilter = currentRole === "manager" ? "Operations" : null;
  const emps = deptFilter ? EMPLOYEES.filter(e=>e.dept===deptFilter) : EMPLOYEES;
  const excs = deptFilter ? EXCEPTIONS.filter(e=>e.dept===deptFilter) : EXCEPTIONS;

  if(currentPage==="dashboard"){
    if(currentRole==="hr") c.innerHTML = dashboardHR(emps, excs);
    else if(currentRole==="manager") c.innerHTML = dashboardManager(emps, excs);
    else if(currentRole==="payroll") c.innerHTML = dashboardPayroll();
    else if(currentRole==="finance") c.innerHTML = dashboardFinance();
  }
  else if(currentPage==="attendance") c.innerHTML = pageAttendance(emps);
  else if(currentPage==="exceptions") c.innerHTML = pageExceptions(excs);
  else if(currentPage==="reports") c.innerHTML = pageReports(deptFilter);
  else if(currentPage==="employees") c.innerHTML = pageEmployees(emps);
  else if(currentPage==="departments") c.innerHTML = pageDepartments();
  else if(currentPage==="notifications") c.innerHTML = pageNotifications();
  else if(currentPage==="settings") c.innerHTML = pageSettings();
  bindPageEvents();
}

function summary(emps){
  const total = emps.length, present = emps.filter(e=>e.status==="Present").length;
  const absent = emps.filter(e=>e.status==="Absent").length, late = emps.filter(e=>e.status==="Late").length;
  const rate = total ? ((present+late)/total*100).toFixed(1) : "0.0";
  return {total, present, absent, late, rate};
}

/* ---- HR dashboard ---- */
function dashboardHR(emps, excs){
  const s = summary(emps);
  const recent = excs.slice(0,3);
  return `
  <p class="muted" style="margin-bottom:18px">Good morning, HR 👋</p>
  <div class="stat-grid">
    ${statCard("Total Employees", s.total, "blue")}
    ${statCard("Present Today", s.present, "green")}
    ${statCard("Absent", s.absent, "red")}
    ${statCard("Late", s.late, "orange")}
  </div>
  <div class="panel">
    <h3>Attendance Rate</h3>
    <div class="progress-row">
      <div class="progress"><div class="progress-fill" style="width:${s.rate}%"></div></div>
      <span class="progress-value">${s.rate}%</span>
    </div>
  </div>
  <div class="panel">
    <h3>Recent Exceptions</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>Employee</th><th>Department</th><th>Issue</th><th>Status</th></tr></thead>
      <tbody>${recent.map(e=>`<tr><td>${e.emp} — ${esc(e.name)}</td><td>${e.dept}</td><td>${e.type}</td><td>${statusBadge(e.status)}</td></tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}

/* ---- Manager dashboard ---- */
function dashboardManager(emps, excs){
  const s = summary(emps);
  const lates = excs.filter(e=>e.type==="Late Arrival").length;
  const missing = excs.filter(e=>e.type==="Missing Punch").length;
  const early = excs.filter(e=>e.type==="Early Departure").length;
  return `
  <p class="muted" style="margin-bottom:18px">Operations Department 👔</p>
  <div class="stat-grid">
    ${statCard("Employees", s.total)}
    ${statCard("Present", s.present, "green")}
    ${statCard("Absent", s.absent, "red")}
    ${statCard("Late", s.late, "orange")}
  </div>
  <div class="panel">
    <h3>Attendance Rate</h3>
    <div class="progress-row">
      <div class="progress"><div class="progress-fill" style="width:${s.rate}%"></div></div>
      <span class="progress-value">${s.rate}%</span>
    </div>
  </div>
  <div class="panel">
    <h3>Today's Exceptions</h3>
    <div class="dept-list">
      <div class="dept-row"><span>🟠 Late Arrivals</span><div class="progress"><div class="progress-fill" style="width:${lates*30}%;background:linear-gradient(90deg,#ea580c,#fdba74)"></div></div><span class="hrs">${lates}</span></div>
      <div class="dept-row"><span>🔴 Missing Punches</span><div class="progress"><div class="progress-fill" style="width:${missing*30}%;background:linear-gradient(90deg,#dc2626,#fca5a5)"></div></div><span class="hrs">${missing}</span></div>
      <div class="dept-row"><span>🟡 Early Departures</span><div class="progress"><div class="progress-fill" style="width:${early*30}%;background:linear-gradient(90deg,#d97706,#fde68a)"></div></div><span class="hrs">${early}</span></div>
    </div>
  </div>`;
}

/* ---- Payroll dashboard ---- */
function dashboardPayroll(){
  const unverified = EXCEPTIONS.filter(e=>e.status!=="Resolved").length;
  const missing = EXCEPTIONS.filter(e=>e.type==="Missing Punch").length;
  const totalHrs = OVERTIME_BY_DEPT.reduce((a,b)=>a+b.hrs,0);
  const max = Math.max(...OVERTIME_BY_DEPT.map(d=>d.hrs));
  return `
  <p class="muted" style="margin-bottom:18px">Payroll Attendance 💰</p>
  <div class="stat-grid">
    ${statCard("Total Employees", "1,248", "blue")}
    ${statCard("Overtime Hours", totalHrs, "orange")}
    ${statCard("Unverified Records", unverified, "red")}
    ${statCard("Missing Punches", missing, "red")}
  </div>
  <div class="panel">
    <h3>Overtime by Department</h3>
    <div class="dept-list">
      ${OVERTIME_BY_DEPT.map(d=>`<div class="dept-row"><span>${d.dept}</span>
        <div class="progress"><div class="progress-fill" style="width:${(d.hrs/max*100).toFixed(0)}%;background:linear-gradient(90deg,#2563eb,#93c5fd)"></div></div>
        <span class="hrs">${d.hrs} hrs</span></div>`).join("")}
    </div>
  </div>`;
}

/* ---- Finance dashboard ---- */
function dashboardFinance(){
  const max = Math.max(...OVERTIME_BY_DEPT.map(d=>d.hrs));
  return `
  <p class="muted" style="margin-bottom:18px">Financial Overview 📊</p>
  <div class="stat-grid">
    ${statCard("Total Labour Cost", "$1.24M", "blue")}
    ${statCard("Overtime Cost", "$84,520", "orange")}
    ${statCard("Avg Cost / Employee", "$994", "green")}
  </div>
  <div class="panel">
    <h3>Overtime Trend (hrs)</h3>
    <div class="bar-chart">
      ${OVERTIME_BY_DEPT.map(d=>`<div class="bar-col"><div class="bar" style="height:${(d.hrs/max*100).toFixed(0)}%"><span class="bar-val">${d.hrs}</span></div><span class="bar-label">${d.dept.slice(0,6)}</span></div>`).join("")}
    </div>
  </div>
  <div class="panel">
    <h3>Department Labour Cost</h3>
    ${lineChartSVG([88,84,90,82,79,85,81],["Apr","May","Jun","Jul","Aug","Sep","Oct"])}
    <div class="legend"><span class="lg-green">Labour cost index</span></div>
  </div>`;
}

/* ---- Attendance page ---- */
function pageAttendance(emps){
  return `
  <div class="toolbar">
    <input type="date" id="att-date" value="2026-10-03">
    <select id="att-dept"><option value="">All Departments</option>${[...new Set(EMPLOYEES.map(e=>e.dept))].map(d=>`<option>${d}</option>`).join("")}</select>
    <input type="text" id="att-search" placeholder="Search employee…">
    <select id="att-status"><option value="">All Statuses</option><option>Present</option><option>Late</option><option>Absent</option></select>
    <div class="spacer"></div>
    <button class="btn btn-ghost btn-sm" id="att-export">⬇ Export CSV</button>
  </div>
  <div class="panel"><div class="table-wrap"><table id="att-table">
    <thead><tr><th>Employee ID</th><th>Employee</th><th>Department</th><th>Date</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr></thead>
    <tbody>${emps.map(e=>`<tr data-dept="${e.dept}" data-name="${esc(e.name.toLowerCase())}" data-status="${e.status}">
      <td>${e.id}</td><td>${esc(e.name)}</td><td>${e.dept}</td><td>03/10/2026</td>
      <td>${e.checkin}</td><td>${e.checkout}</td><td>${statusBadge(e.status)}</td></tr>`).join("")}</tbody>
  </table></div></div>`;
}

/* ---- Exceptions page ---- */
function pageExceptions(excs){
  const open = excs.filter(e=>e.status==="Open").length;
  const crit = excs.filter(e=>e.severity==="High").length;
  const review = excs.filter(e=>e.status==="Review").length;
  const resolved = EXCEPTIONS.filter(e=>e.status==="Resolved").length;
  return `
  <div class="stat-grid">
    ${statCard("⚠ Open Exceptions", open, "orange")}
    ${statCard("🔴 Critical", crit, "red")}
    ${statCard("🟠 Requires Review", review, "orange")}
    ${statCard("🟢 Resolved", resolved, "green")}
  </div>
  <div class="panel"><div class="table-wrap"><table>
    <thead><tr><th>Employee</th><th>Exception Type</th><th>Date</th><th>Severity</th><th>Status</th><th></th></tr></thead>
    <tbody>${excs.map(e=>`<tr>
      <td>${e.emp} — ${esc(e.name)}</td><td>${e.type}</td><td>${e.date}</td>
      <td>${statusBadge(e.severity)}</td><td>${statusBadge(e.status)}</td>
      <td><button class="btn btn-primary btn-sm" data-review="${e.id}">Review</button></td></tr>`).join("")}</tbody>
  </table></div></div>`;
}

/* ---- Reports page ---- */
function pageReports(deptLabel){
  const title = deptLabel ? `${deptLabel} Attendance Report` : "Attendance Report";
  return `
  <div class="toolbar">
    <select><option>Daily</option><option>Weekly</option><option>Monthly</option></select>
    <select><option>Absence Trends</option><option>Overtime</option><option>Department Comparison</option><option>Exception Trends</option></select>
    <div class="spacer"></div>
    <button class="btn btn-primary btn-sm" id="report-gen">Generate Report</button>
    <button class="btn btn-ghost btn-sm" id="report-pdf">⬇ Export PDF</button>
    <button class="btn btn-ghost btn-sm" id="report-csv">⬇ Export CSV</button>
  </div>
  <div class="panel">
    <h3>${title}</h3>
    ${lineChartSVG(WEEK_ATTENDANCE,["Mon","Tue","Wed","Thu","Fri"])}
    <div class="legend"><span class="lg-blue">Attendance %</span></div>
  </div>
  <div class="panel">
    <h3>Weekly Summary</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>Day</th><th>Attendance</th><th>Change</th></tr></thead>
      <tbody>${WEEK_ATTENDANCE.map((v,i)=>`<tr><td>${["Monday","Tuesday","Wednesday","Thursday","Friday"][i]}</td><td>${v}%</td><td style="color:${i&&v<WEEK_ATTENDANCE[i-1]?"#dc2626":"#16a34a"}">${i?(v-WEEK_ATTENDANCE[i-1]>=0?"+":"")+(v-WEEK_ATTENDANCE[i-1])+"%":"—"}</td></tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}

/* ---- Simple pages ---- */
function pageEmployees(emps){
  return `<div class="panel"><h3>Employee Directory</h3><div class="table-wrap"><table>
    <thead><tr><th>ID</th><th>Name</th><th>Department</th><th>Status Today</th></tr></thead>
    <tbody>${emps.map(e=>`<tr><td>${e.id}</td><td>${esc(e.name)}</td><td>${e.dept}</td><td>${statusBadge(e.status)}</td></tr>`).join("")}</tbody>
  </table></div></div>`;
}
function pageDepartments(){
  const depts = [...new Set(EMPLOYEES.map(e=>e.dept))];
  return `<div class="stat-grid">${depts.map(d=>{
    const n = EMPLOYEES.filter(e=>e.dept===d).length;
    const p = EMPLOYEES.filter(e=>e.dept===d&&e.status!=="Absent").length;
    return `<div class="stat-card"><div class="stat-label">🏢 ${d}</div>
      <div class="stat-value blue">${n}</div>
      <div class="muted" style="font-size:.8rem">${p} present · ${(p/n*100).toFixed(0)}% rate</div></div>`;}).join("")}</div>`;
}
function pageNotifications(){
  const items = [
    ["🔴","Exception EX-02 (Missing Punch) requires review","2 min ago"],
    ["🟠","3 late arrivals detected in Operations","1 hr ago"],
    ["🟢","Payroll verification batch completed","3 hrs ago"],
  ];
  return `<div class="panel"><h3>Notifications</h3><div class="dept-list">
    ${items.map(i=>`<div class="dept-row" style="grid-template-columns:34px 1fr 90px"><span>${i[0]}</span><span>${i[1]}</span><span class="muted" style="font-size:.78rem">${i[2]}</span></div>`).join("")}
  </div></div>`;
}
function pageSettings(){
  return `<div class="panel"><h3>Settings</h3>
    <div class="dept-list">
      <div class="dept-row" style="grid-template-columns:200px 1fr"><span>Standard check-in</span><strong>08:00 AM</strong></div>
      <div class="dept-row" style="grid-template-columns:200px 1fr"><span>Standard check-out</span><strong>05:00 PM</strong></div>
      <div class="dept-row" style="grid-template-columns:200px 1fr"><span>Late threshold</span><strong>15 minutes</strong></div>
      <div class="dept-row" style="grid-template-columns:200px 1fr"><span>Exception alerts</span><strong>Enabled (email + dashboard)</strong></div>
    </div></div>`;
}

/* ---------------- MODAL ---------------- */
function openModal(html){ $("#modal-body").innerHTML = html; $("#modal-overlay").classList.remove("hidden"); }
function closeModal(){ $("#modal-overlay").classList.add("hidden"); }
$("#modal-close").addEventListener("click", closeModal);
$("#modal-overlay").addEventListener("click", e=>{ if(e.target.id==="modal-overlay") closeModal(); });

function showException(exc){
  selectedException = exc;
  openModal(`
    <div class="exc-grid">
      <div><div class="k">Employee</div><div class="v">${exc.emp} — ${esc(exc.name)}</div></div>
      <div><div class="k">Department</div><div class="v">${exc.dept}</div></div>
      <div><div class="k">Date</div><div class="v">${exc.date}</div></div>
      <div><div class="k">Exception</div><div class="v">${exc.type}</div></div>
      <div><div class="k">Expected Check-in</div><div class="v">${exc.expected}</div></div>
      <div><div class="k">Actual Check-in</div><div class="v" style="color:${exc.severity==="High"?"#dc2626":"#ea580c"}">${exc.actual}</div></div>
      <div><div class="k">Severity</div><div class="v">${statusBadge(exc.severity)}</div></div>
      <div><div class="k">Status</div><div class="v">${statusBadge(exc.status)}</div></div>
    </div>
    <div class="k" style="color:var(--muted);font-size:.78rem;margin-bottom:6px">COMMENT (OPTIONAL)</div>
    <input type="text" id="exc-comment" placeholder="Add a note about this exception…" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;font-family:inherit">
    <div class="modal-actions">
      <button class="btn btn-success btn-sm" id="exc-resolve">✔ Mark as Resolved</button>
      <button class="btn btn-warn btn-sm" id="exc-escalate">⬆ Escalate</button>
      <button class="btn btn-ghost btn-sm" id="exc-comment-btn">💬 Add Comment</button>
    </div>`);
  $("#exc-resolve").onclick = ()=>{ exc.status="Resolved"; closeModal(); toast(`Exception ${exc.id} marked as resolved ✔`); render(); };
  $("#exc-escalate").onclick = ()=>{ exc.severity="High"; closeModal(); toast(`Exception ${exc.id} escalated to Critical ⬆`); render(); };
  $("#exc-comment-btn").onclick = ()=>{ const v=$("#exc-comment").value.trim(); toast(v?`Comment added to ${exc.id} 💬`:"Please type a comment first"); };
}

/* ---------------- PAGE EVENTS ---------------- */
function bindPageEvents(){
  document.querySelectorAll("[data-review]").forEach(b=>{
    b.onclick = ()=> showException(EXCEPTIONS.find(e=>e.id===b.dataset.review));
  });

  // Attendance filters
  const dept = $("#att-dept"), search = $("#att-search"), status = $("#att-status");
  function filterAtt(){
    const q = (search?.value||"").toLowerCase();
    document.querySelectorAll("#att-table tbody tr").forEach(tr=>{
      const okD = !dept?.value || tr.dataset.dept===dept.value;
      const okS = !status?.value || tr.dataset.status===status.value;
      const okQ = !q || tr.dataset.name.includes(q);
      tr.style.display = (okD&&okS&&okQ) ? "" : "none";
    });
  }
  [dept,search,status].forEach(el=> el && el.addEventListener("input", filterAtt));
  const exp = $("#att-export");
  if(exp) exp.onclick = ()=>{
    exportCSV([["Employee ID","Employee","Department","Date","Check-in","Check-out","Status"],
      ...EMPLOYEES.map(e=>[e.id,e.name,e.dept,"03/10/2026",e.checkin,e.checkout,e.status])], "warded_attendance.csv");
    toast("attendance.csv downloaded ⬇");
  };

  // Reports
  const gen = $("#report-gen");
  if(gen) gen.onclick = ()=>toast("Report generated ✔ (data refreshed)");
  const pdf = $("#report-pdf");
  if(pdf) pdf.onclick = ()=>{ window.print(); toast("Use the print dialog → Save as PDF"); };
  const csv = $("#report-csv");
  if(csv) csv.onclick = ()=>{
    exportCSV([["Day","Attendance %"],...WEEK_ATTENDANCE.map((v,i)=>[["Monday","Tuesday","Wednesday","Thursday","Friday"][i],v])], "warded_report.csv");
    toast("report.csv downloaded ⬇");
  };
}
