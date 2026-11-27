// Ambil snapshot data dari backend NOC PID (project noc-pid) ke src/app/noc-data.json.
// Presentasi ini static export, jadi data dibekukan saat sync agar tetap tampil tanpa internet.
// Jalankan: npm run sync:noc  (opsional: NOC_API_URL=http://localhost:4000 npm run sync:noc)
import { writeFile } from "node:fs/promises";

const BASE = (process.env.NOC_API_URL || "https://api-noc.sspace.web.id").replace(/\/$/, "");
const YEAR = Number(process.env.NOC_YEAR || 2026);
const OUT = new URL("../src/app/noc-data.json", import.meta.url);
const TYPE_LABELS = { "IP CCTV": "IP CCTV", AWK: "AWK", IADEA: "IADEA", "ITA PC": "ITA PC", "CCTV RECORDER": "CCTV Recorder", MIKROTIK: "MikroTik" };
// Jumlah terpasang dari inventaris deck (Device Inventory).
const INVENTORY = { "IP CCTV": 412, AWK: 355, IADEA: 206, "ITA PC": 31, "CCTV Recorder": 31, MikroTik: 31 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const get = async path => {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
};
const pad = n => String(n).padStart(2, "0");
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

try {
  // Periode: 1 Jan sampai akhir bulan penuh terakhir (bulan berjalan tidak dihitung).
  const now = new Date();
  const endMonth = now.getFullYear() > YEAR ? 12 : now.getMonth(); // 1-based bulan terakhir yang penuh
  const from = `${YEAR}-01-01`;
  const to = `${YEAR}-${pad(endMonth)}-${pad(lastDay(YEAR, endMonth))}`;

  const monthly = [];
  for (let m = 1; m <= endMonth; m++) {
    const s = await get(`/tickets/summary?from=${YEAR}-${pad(m)}-01&to=${YEAR}-${pad(m)}-${pad(lastDay(YEAR, m))}`);
    monthly.push({ month: `${YEAR}-${pad(m)}`, label: MONTHS[m - 1], total: s.total, resolved: s.status.RESOLVED + s.status.CLOSED, bySystem: s.resolved_by_system });
  }

  const [summary, deviceSummary, deviceStatus, devices, technicians, scheduler] = await Promise.all([
    get(`/tickets/summary?from=${from}&to=${to}`),
    get(`/tickets/device-summary?from=${from}&to=${to}`),
    get(`/device-status/stats`),
    get(`/devices/stats`),
    get(`/technicians`),
    get(`/device-status/scheduler`),
  ]);

  const resolved = summary.status.RESOLVED + summary.status.CLOSED;

  // Incident per jenis perangkat: ambil tiket per bulan, dedupe, hitung per tipe (prefix nama device).
  const periodStart = new Date(`${from}T00:00:00+07:00`).getTime();
  const periodEnd = new Date(`${to}T23:59:59.999+07:00`).getTime();
  const tickets = new Map();
  for (const m of monthly.filter(x => x.total > 0)) {
    for (const tk of await get(`/tickets?month=${m.month}`)) {
      const created = new Date(tk.created_at).getTime();
      if (created >= periodStart && created <= periodEnd) tickets.set(tk.id, tk);
    }
  }
  const groups = new Map();
  for (const tk of tickets.values()) {
    const dev = tk.device ?? {};
    const raw = (dev.name ?? "").replace(/[\s\d-]+$/, "").trim().toUpperCase() || "LAINNYA";
    const type = TYPE_LABELS[raw] ?? raw;
    const g = groups.get(type) ?? { type, incidents: 0, bySystem: 0, byMaintenance: 0, resolveMs: 0, resolvedCount: 0, devices: new Map() };
    g.incidents++;
    // Selesai oleh sistem = RESOLVED dengan source "RESOLVED BY SYSTEM" (sama dengan logika backend NOC).
    const done = tk.status === "RESOLVED" || tk.status === "CLOSED";
    const bySystem = tk.status === "RESOLVED" && (tk.source ?? "").trim().toUpperCase() === "RESOLVED BY SYSTEM";
    if (bySystem) g.bySystem++;
    else if (done) g.byMaintenance++;
    if (tk.resolved_at) { g.resolveMs += new Date(tk.resolved_at) - new Date(tk.created_at); g.resolvedCount++; }
    const d = g.devices.get(tk.device_id) ?? { name: dev.name, krl: dev.krl_name, gerbong: dev.gerbong, count: 0, bySystem: 0, byMaintenance: 0 };
    d.count++;
    if (bySystem) d.bySystem++;
    else if (done) d.byMaintenance++;
    g.devices.set(tk.device_id, d);
    groups.set(type, g);
  }
  const byType = [...groups.values()].sort((a, b) => b.incidents - a.incidents).map(g => {
    const devs = [...g.devices.values()].sort((a, b) => b.count - a.count);
    return {
      type: g.type,
      inventory: INVENTORY[g.type] ?? null,
      incidents: g.incidents,
      bySystem: g.bySystem,
      byMaintenance: g.byMaintenance,
      devicesAffected: devs.length,
      recurringDevices: devs.filter(d => d.count > 1).length,
      avgResolveHours: g.resolvedCount ? Math.round((g.resolveMs / g.resolvedCount / 36e5) * 10) / 10 : null,
      top: devs.slice(0, 3),
    };
  });
  // Indikator proses dari tiket: prioritas yang dipakai & tiket yang punya penugasan teknisi.
  const priority = {};
  let assigned = 0;
  for (const tk of tickets.values()) {
    priority[tk.priority] = (priority[tk.priority] ?? 0) + 1;
    if (tk.assignments?.length) assigned++;
  }
  const activeDays = Math.max(1, Math.round((periodEnd - new Date(`${monthly.find(m => m.total > 0)?.month ?? from.slice(0, 7)}-01T00:00:00+07:00`).getTime()) / 864e5));
  const process = {
    priority,
    assigned,
    ticketsPerDay: Math.round(tickets.size / activeDays),
    technicians: Array.isArray(technicians) ? technicians.length : (technicians.data?.length ?? null),
    pingIntervalMinutes: scheduler.interval_minutes ?? null,
  };
  // Beban per teknisi dari penugasan tiket; nama disamarkan (Teknisi A, B, ...), hanya level dan tim yang dibawa.
  const techs = new Map();
  for (const tk of tickets.values()) {
    for (const a of tk.assignments ?? []) {
      const t = techs.get(a.technician_id) ?? { layer: a.technician?.layer ?? null, team: a.technician?.team ?? null, assigned: 0, completed: 0 };
      t.assigned++;
      if (a.completion) t.completed++;
      techs.set(a.technician_id, t);
    }
  }
  const perTechnician = [...techs.values()].sort((x, y) => y.assigned - x.assigned)
    .map((t, i) => ({ label: `Teknisi ${String.fromCharCode(65 + i)}`, ...t }));
  // Pembuat tiket NOC per orang, disamarkan (Petugas NOC A, B, ...).
  const nocCreators = summary.creators.filter(c => /noc/i.test(c.name) && !/test/i.test(c.name))
    .sort((x, y) => y.count - x.count).map((c, i) => ({ label: `Petugas NOC ${String.fromCharCode(65 + i)}`, count: c.count }));
  // Bulan penuh terakhir: beban per teknisi + pola kerja (shift penyelesaian, hari aktif, panjang catatan).
  const lastMonthKey = [...monthly].reverse().find(m => m.total > 0)?.month;
  const lastSummary = lastMonthKey ? await get(`/tickets/summary?from=${lastMonthKey}-01&to=${lastMonthKey}-${pad(lastDay(YEAR, Number(lastMonthKey.slice(5))))}`) : null;
  const lastTickets = [...tickets.values()].filter(tk => {
    const d = new Date(new Date(tk.created_at).getTime() + 7 * 36e5).toISOString().slice(0, 7);
    return d === lastMonthKey;
  });
  const lastTechs = new Map();
  for (const tk of lastTickets) {
    for (const a of tk.assignments ?? []) {
      const t = lastTechs.get(a.technician_id) ?? { layer: a.technician?.layer ?? null, team: a.technician?.team ?? null, assigned: 0, completed: 0, shift: { pagi: 0, sore: 0, malam: 0 }, days: new Map(), words: 0 };
      t.assigned++;
      if (a.completion) {
        t.completed++;
        const wib = new Date(new Date(a.completion.completed_at).getTime() + 7 * 36e5);
        const h = wib.getUTCHours();
        t.shift[h >= 5 && h < 14 ? "pagi" : h >= 14 && h < 21 ? "sore" : "malam"]++;
        const day = wib.toISOString().slice(0, 10);
        t.days.set(day, (t.days.get(day) ?? 0) + 1);
        t.words += (a.completion.note ?? "").trim().split(/\s+/).filter(Boolean).length;
      }
      lastTechs.set(a.technician_id, t);
    }
  }
  const lastMonth = lastMonthKey && {
    month: lastMonthKey,
    total: lastSummary.total,
    resolvedBySystem: lastSummary.resolved_by_system,
    assigned: lastTickets.filter(tk => tk.assignments?.length).length,
    perTechnician: [...lastTechs.values()].sort((x, y) => y.assigned - x.assigned).map((t, i) => {
      const perDay = [...t.days.values()].sort((x, y) => x - y);
      return {
        label: `Teknisi ${String.fromCharCode(65 + i)}`, layer: t.layer, team: t.team, assigned: t.assigned, completed: t.completed,
        activeDays: t.days.size, medianPerDay: perDay.length ? perDay[Math.floor(perDay.length / 2)] : 0, shift: t.shift,
        avgNoteWords: t.completed ? Math.round((t.words / t.completed) * 10) / 10 : 0,
      };
    }),
    nocCreators: lastSummary.creators.filter(c => /noc/i.test(c.name) && !/test/i.test(c.name))
      .sort((x, y) => y.count - x.count).map((c, i) => ({ label: `Petugas NOC ${String.fromCharCode(65 + i)}`, count: c.count })),
  };
  // Nama pembuat tiket digabung per kategori agar tidak menampilkan nama personel.
  const source = { system: 0, noc: 0, other: 0 };
  for (const c of summary.creators) {
    if (/test/i.test(c.name)) continue;
    if (/^system$/i.test(c.name.trim())) source.system += c.count;
    else if (/noc/i.test(c.name)) source.noc += c.count;
    else source.other += c.count;
  }

  const data = {
    generatedAt: now.toISOString(),
    source: BASE,
    period: { from, to },
    firstMonthWithData: monthly.find(m => m.total > 0)?.month ?? null,
    totals: {
      total: summary.total,
      resolved,
      open: summary.status.OPEN + summary.status.IN_PROGRESS,
      pending: summary.status.PENDING,
      resolvedBySystem: summary.resolved_by_system,
      resolutionRate: summary.total ? Math.round((resolved / summary.total) * 10000) / 100 : 0,
    },
    monthly,
    ticketSource: source,
    byType,
    process,
    perTechnician,
    nocCreators,
    lastMonth,
    topDown: deviceSummary.top_down.map(d => ({
      name: d.name, krl: d.krl_name, gerbong: d.gerbong,
      downCount: d.down_count, downtimeHours: Math.round(d.downtime_minutes / 60),
    })),
    deviceStatus: { total: deviceStatus.total, online: deviceStatus.online, offline: deviceStatus.offline, uptime: deviceStatus.uptime_percentage },
    devices: { total: devices.total, active: devices.active, inactive: devices.inactive },
  };

  await writeFile(OUT, JSON.stringify(data, null, 2) + "\n");
  console.log(`noc-data.json diperbarui dari ${BASE} (${from} s/d ${to}, ${data.totals.total} tiket)`);
} catch (err) {
  // Jangan gagalkan build: snapshot lama tetap dipakai.
  console.warn(`Sync NOC gagal, memakai snapshot lama: ${err.message}`);
}
