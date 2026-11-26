// Materi presentasi PID Maintenance Improvement Plan 2027 (PID / TV Kereta).
// Sumber: PID_Maintenance_Improvement_Plan_2027.pptx. Setiap tile memiliki
// beberapa halaman detail yang tampil saat tile diklik. Angka tiket & perangkat
// diambil dari snapshot backend NOC PID (noc-data.json, lihat scripts/sync-noc.mjs).

import noc from "./noc-data.json";
import { screenStats as ss } from "./screen-issues";
import nocDashboard from "../../public/noc-dashboard.webp";

export type DetailItem = { value?: string; title?: string; text?: string; points?: string[]; example?: string; exampleLabel?: string };

export type Chart =
  | { kind: "bar"; title: string; categories: string[]; series: { name: string; values: number[] }[] }
  | { kind: "hbar"; title: string; rows: { label: string; sub?: string; value: number; parts?: number[] }[]; unit: string; legend?: string[] }
  | { kind: "donut"; title: string; center: string; caption?: string; segments: { label: string; value: number }[] }
  | { kind: "groups"; title: string; legend?: string[]; groups: { title: string; meta: string; rows: { label: string; sub: string; value: number; parts?: number[] }[] }[] };

/** Kartu ringkasan biaya; `detail` tampil sebagai popup saat kartu diklik. */
export type CostTotal = {
  label: string;
  value: string;
  text?: string;
  main?: boolean;
  detail?: { definition: string; rows: { label: string; sub?: string; value: string; total?: boolean }[]; note?: string };
};

export type DetailPage = {
  title: string;
  lead?: string;
  layout?: "stats" | "cards" | "steps";
  items?: DetailItem[];
  charts?: Chart[];
  /** Baris ringkasan biaya di bawah kartu (mis. capex/opex setahun). */
  totals?: CostTotal[];
  note?: string;
  /** Panel sempit setinggi halaman di sisi kanan (mis. analisa per perangkat). */
  aside?: { title: string; items: { title: string; text: string }[]; note?: string };
  /** Gambar pendukung di sisi kanan halaman (mis. screenshot aplikasi). */
  image?: { src: string; alt: string; caption?: string };
  /** Kartu diregangkan mengisi tinggi halaman. */
  fill?: boolean;
  /** Sumber data di footer; default: NOC PID untuk halaman berchart. */
  source?: string;
};

export type Highlight = { label: string; value: string };

const fmt = (n: number) => n.toLocaleString("id-ID");
const pct = (part: number, whole: number) => `${((part / whole) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
const MONTH_NAMES: Record<string, string> = { "01": "Januari", "02": "Februari", "03": "Maret", "04": "April", "05": "Mei", "06": "Juni", "07": "Juli", "08": "Agustus", "09": "September", "10": "Oktober", "11": "November", "12": "Desember" };
const monthName = (ym: string | null) => (ym ? `${MONTH_NAMES[ym.slice(5, 7)]} ${ym.slice(0, 4)}` : "-");
const t = noc.totals;
const outstanding = t.open + t.pending;
const byTeam = t.resolved - t.resolvedBySystem;
const rate = `${t.resolutionRate.toLocaleString("id-ID")}%`;
const periodLabel = `Januari – ${monthName(noc.period.to.slice(0, 7))}`;
const dataMonths = noc.monthly.filter(m => noc.firstMonthWithData && m.month >= noc.firstMonthWithData);
const sourceTotal = noc.ticketSource.system + noc.ticketSource.noc + noc.ticketSource.other;
// Enam jenis perangkat utama (sesuai inventaris); tipe kecil lain tidak ditampilkan.
const mainTypes = noc.byType.filter(g => g.inventory !== null);
const typeRows = [
  ...mainTypes.map(g => ({ label: g.type, sub: `${fmt(g.devicesAffected)} dari ${fmt(g.inventory ?? 0)} unit terdampak · rata-rata selesai ${(g.avgResolveHours ?? 0).toLocaleString("id-ID")} jam`, value: g.incidents, parts: [g.bySystem, g.byMaintenance] })),
];
// Indikator kekurangan proses dari data tiket NOC.
const pr = noc.process;
// Tiket manual = dibuat NOC + petugas lain (bukan sistem).
const manualShare = pct(noc.ticketSource.noc + noc.ticketSource.other, sourceTotal);
const assignedShare = pct(pr.assigned, t.total);
const mediumShare = `${(Math.floor(((pr.priority.MEDIUM ?? 0) / t.total) * 10000) / 100).toLocaleString("id-ID")}%`;
const manualPerPerson = Math.round((pr.ticketsPerDay * noc.ticketSource.noc) / sourceTotal / 2);
export const nocSnapshot = `Sumber: NOC PID · data per ${new Date(noc.generatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`;

export type Tile = {
  id: string;
  number: string;
  section: string;
  title: string;
  /** Keterangan muka depan tile; lebih dari satu poin ditampilkan sebagai daftar. */
  summary?: string[];
  list?: string[];
  numbered?: boolean;
  icon?: string;
  highlights: Highlight[];
  pages: DetailPage[];
};

export const tiles: Tile[] = [
  {
    id: "overview",
    number: "01",
    section: "01 / GAMBARAN OPERASIONAL",
    title: "Ringkasan Eksekutif",
    icon: "▣",
    list: ["Tantangan saat ini", "Kendala operasional", "Kendala layar", "Skala operasional", "Inventaris perangkat", "Tenaga kerja & alokasi shift"],
    highlights: [
      { label: "Layar PID", value: "1.192" },
      { label: "Kereta / rangkaian", value: "298 / 31" },
      { label: "Depo perawatan", value: "8" },
      { label: "Perangkat aktif di NOC", value: `${fmt(noc.devices.active)} / ${fmt(noc.devices.total)}` },
      { label: "Kru malam / NOC", value: "4 / 2 orang" },
      { label: "Layar bermasalah tercatat", value: `${ss.total} layar` },
    ],
    pages: [
      {
        title: "Ringkasan Eksekutif",
        lead: "Fokus 2027: menjaga media PID / TV kereta siap tayang setiap hari.",
        layout: "cards",
        items: [
          { title: "Tantangan saat ini", text: "Klien masih menemukan layar mati meskipun masalahnya sudah diketahui tim." },
          {
            title: "Kendala utama",
            points: [
              "Sistem: tiket tanpa prioritas dan tanpa verifikasi layar tayang",
              "Suku cadang: belum ada stok, permintaan, dan keterlacakan",
              `SDM: 2 personel NOC dan ${pr.technicians} teknisi untuk 1.192 layar`,
              `Layar: ${ss.total} layar bermasalah, rata-rata ${ss.avgDays} hari hingga selesai`,
            ],
          },
          {
            title: "Arah 2027",
            points: [
              "Tiket dibuat otomatis dari hasil ping dan diberi prioritas P1–P4 sesuai jumlah layar terdampak",
              "Tiket ditutup setelah layar terverifikasi tayang",
              "Setiap tiket punya penugasan dan bukti pekerjaan teknisi",
              "Perawatan preventif terjadwal dan stok suku cadang terpantau",
              "Teknisi tetap di 6 depo dan 2 kru malam mobile agar penanganan tidak menunggu giliran",
              "Layar bermasalah tercatat di tiket NOC dan dipantau hingga tayang kembali",
            ],
          },
        ],
      },
      {
        title: "Kendala Operasional",
        lead: "Kekurangan dari sisi sistem, suku cadang, SDM, dan kondisi layar.",
        layout: "cards",
        items: [
          {
            title: "Kendala sistem",
            points: [
              `Prioritas belum dibedakan: ${mediumShare} tiket berstatus MEDIUM, sehingga satu rangkaian mati ditangani sama dengan gangguan ringan`,
              `${pct(t.resolvedBySystem, t.total)} tiket ditutup otomatis saat ping pulih, tanpa bukti layar tayang`,
              `Hanya ${assignedShare} tiket (${fmt(pr.assigned)} dari ${fmt(t.total)}) yang ditugaskan ke teknisi; sisanya selesai tanpa catatan pengecekan fisik perangkat`,
              "Ping tidak mendeteksi layar mati, bergaris, atau redup selama perangkatnya tetap daring",
              "Belum ada jadwal perawatan preventif di sistem",
            ],
          },
          {
            title: "Kendala suku cadang",
            points: [
              "Belum ada modul stok, permintaan, dan reservasi suku cadang di sistem NOC",
              "Kebutuhan komponen masih dilaporkan kru secara manual",
              "Belum ada stok minimum dan keterlacakan nomor seri",
              `Perbaikan layar rata-rata ${ss.avgDays} hari (median ${ss.medianDays} hari); indikasi menunggu suku cadang`,
            ],
          },
          {
            title: "Kendala SDM",
            points: [
              `2 personel NOC menerbitkan ±${manualPerPerson} tiket manual per orang per hari`,
              `${pr.technicians} teknisi terdaftar untuk 1.192 layar di 298 kereta`,
              "Shift pagi/sore: 1 ketua tim + 2 PKL",
              "4 kru malam dengan 1 mobil untuk 8 depo",
            ],
          },
          {
            title: "Kendala layar",
            points: [
              `${ss.total} layar PID bermasalah tercatat di ${ss.rangkaian} rangkaian (KA)`,
              `${ss.byIssue.off} layar mati, ${ss.byIssue.bergaris} bergaris, ${ss.byIssue.redup} redup`,
              `Baru ${ss.done} layar tercatat selesai; ${ss.total - ss.done} belum`,
              "Dicatat manual di spreadsheet terpisah, belum masuk tiket NOC",
            ],
          },
        ],
      },
      {
        title: "Kendala Layar",
        lead: `Rekap layar PID bermasalah per ${ss.rangkaian} rangkaian (KA); ${ss.over60} dari ${ss.measured} layar yang selesai butuh lebih dari 60 hari.`,
        layout: "stats",
        items: [
          { value: `${ss.total}`, title: "layar bermasalah", text: `Di ${ss.rangkaian} rangkaian, posisi PID 1–4` },
          { value: `${ss.done}`, title: "selesai", text: `${ss.total - ss.done} layar belum tercatat selesai` },
          { value: `${ss.avgDays} hari`, title: "rata-rata penyelesaian", text: `Median ${ss.medianDays} hari: separuh layar selesai dalam ${ss.medianDays} hari atau kurang, separuh lainnya lebih lama` },
        ],
        charts: [
          {
            kind: "donut",
            title: "Jenis masalah layar",
            center: `${ss.total}`,
            caption: "layar",
            segments: [
              { label: "Layar mati", value: ss.byIssue.off },
              { label: "Bergaris / redup", value: ss.byIssue.bergaris + ss.byIssue.redup },
              { label: "Jenis belum diisi", value: ss.byIssue.kosong },
            ],
          },
          {
            kind: "donut",
            title: "Status penyelesaian",
            center: `${ss.total}`,
            caption: "layar",
            segments: [
              { label: "Selesai", value: ss.done },
              { label: "Belum selesai", value: ss.total - ss.done },
            ],
          },
        ],
        note: "Durasi dihitung dari tanggal laporan hingga tanggal selesai.",
        source: "Sumber: rekap layar bermasalah (spreadsheet KA)",
      },
      {
        title: "Skala Operasional",
        lead: "Cakupan aset dan layanan PID.",
        layout: "stats",
        items: [
          { value: "1.192", title: "layar", text: "Total layar PID" },
          { value: "298", title: "kereta", text: "Empat layar per kereta" },
          { value: "31", title: "rangkaian", text: "Cakupan armada" },
          { value: "8", title: "depo", text: "Lokasi perawatan" },
          { value: "24", title: "jam", text: "Tiga shift operasional; mobilitas depo malam 21.00–05.00" },
          { value: "1", title: "mobil", text: "Kendaraan operasional kru malam" },
        ],
      },
      {
        title: "Inventaris Perangkat",
        lead: "Inventaris perangkat pendukung operasional.",
        layout: "stats",
        items: [
          {
            value: "1.192",
            text: "Layar PID",
            points: [
              `${ss.total} rusak tercatat (${(ss.total / 1192 * 100).toFixed(1).replace(".", ",")}%)`,
              `${ss.byIssue.off} mati`,
              `${ss.byIssue.bergaris} bergaris`,
              `${ss.byIssue.redup} redup`,
              `${ss.byIssue.kosong} tanpa keterangan`,
            ],
          },
          { value: "31", text: "ITA PC" },
          { value: "31", text: "CCTV Recorder" },
          { value: "412", text: "IP CCTV" },
          { value: "355", text: "AWK" },
          { value: "206", text: "IADEA" },
          { value: "31", text: "MikroTik" },
        ],
      },
      {
        title: "Tenaga Kerja & Alokasi Shift",
        lead: "Alokasi personel per fungsi; bukan total jumlah personel.",
        layout: "cards",
        items: [
          { value: "05.00–14.00", title: "Shift pagi", text: "1 ketua tim + 2 PKL; perbaikan sesuai tiket." },
          { value: "14.00–22.00", title: "Shift sore", text: "1 ketua tim + 2 PKL; perbaikan sesuai tiket." },
          { value: "21.00–05.00", title: "Shift malam", text: "4 kru; mobilitas dan perawatan di depo." },
          { value: "2 orang", title: "NOC", text: "Pemantauan dan penerbitan tiket; jadwal 24 jam, 5 hari kerja." },
        ],
      },
      {
        title: "Alur Kerja Saat Ini",
        lead: "Alur penanganan gangguan PID saat ini.",
        layout: "steps",
        image: { src: nocDashboard.src, alt: "Tampilan NOC Dashboard: statistik perangkat online dan down per jenis", caption: "Aplikasi NOC PID saat ini: status perangkat dari ping otomatis" },
        items: [
          { value: "01", title: "Deteksi sistem", text: `Sistem NOC PID melakukan ping otomatis ke perangkat tiap ${pr.pingIntervalMinutes} menit.` },
          { value: "02", title: "Temuan lapangan", text: "Laporan dari kru atau klien dicatat terpisah di luar sistem NOC (spreadsheet)." },
          { value: "03", title: "Penerbitan tiket", text: "NOC membuat tiket secara manual dan meneruskannya ke tim lapangan." },
          { value: "04", title: "Penanganan shift pagi/sore", text: "Tim menangani di kereta sesuai akses dan waktu kereta berhenti." },
          { value: "05", title: "Lanjut ke shift malam", text: "Jika tidak bisa ditangani shift pagi/sore, pekerjaan diteruskan ke kru malam di depo." },
          { value: "06", title: "Penyelesaian", text: "Tiket ditutup oleh tim setelah pekerjaan selesai, atau otomatis oleh sistem saat ping perangkat kembali normal." },
        ],
      },
    ],
  },
  {
    id: "performance",
    number: "02",
    section: "02 / EVALUASI KINERJA",
    title: "Kinerja Perawatan 2026",
    summary: [`${fmt(t.total)} total tiket`, `${fmt(t.resolvedBySystem)} selesai oleh sistem`, `${fmt(byTeam)} selesai oleh tim maintenance`],
    icon: "▤",
    highlights: [
      { label: "Total tiket", value: fmt(t.total) },
      { label: "Oleh sistem", value: fmt(t.resolvedBySystem) },
      { label: "Oleh maintenance", value: fmt(byTeam) },
      { label: "Penyelesaian", value: rate },
      { label: "Belum selesai", value: fmt(outstanding) },
    ],
    pages: [
      {
        title: "Kinerja Perawatan 2026",
        lead: `Periode: ${periodLabel}. Tiket tercatat di NOC mulai ${monthName(noc.firstMonthWithData)}.`,
        layout: "stats",
        items: [
          { value: fmt(t.total), title: "Total tiket", text: "Total tiket kerusakan yang tercatat" },
          { value: fmt(t.resolvedBySystem), title: "Selesai oleh sistem", text: `${pct(t.resolvedBySystem, t.total)} tiket; ditutup otomatis saat ping perangkat kembali normal` },
          { value: fmt(byTeam), title: "Selesai oleh tim maintenance", text: `${pct(byTeam, t.total)} tiket; ditutup setelah dikerjakan tim/teknisi` },
        ],
        charts: [{
          kind: "donut",
          title: "Penyelesaian tiket 2026",
          center: fmt(t.total),
          segments: [
            { label: "Selesai oleh sistem", value: t.resolvedBySystem },
            { label: "Selesai oleh tim maintenance", value: byTeam },
            { label: "Belum selesai", value: outstanding },
          ],
        }],
      },
      {
        title: "Indikator Kinerja Lainnya",
        lead: "Waktu penanganan, keberulangan, dan keluhan klien selama 2026.",
        layout: "stats",
        items: [
          { value: fmt(outstanding), title: "Insiden belum selesai", text: `${t.open} terbuka, ${t.pending} tertunda` },
          { value: rate, title: "Tingkat penyelesaian", text: "Persentase insiden yang selesai" },
          { value: "22 jam", title: "Rata-rata waktu tunggu", text: "Dari ditemukan hingga mulai perbaikan" },
          { value: "12j 9m", title: "Rata-rata waktu perbaikan", text: "Durasi pekerjaan (mulai – selesai)" },
          { value: "945", title: "Insiden berulang", text: "Kerusakan berulang pada perangkat yang sama" },
          { value: "5", title: "Keluhan klien", text: "Keluhan klien terkait PID (November)" },
        ],
      },
      {
        title: "Tren Insiden Bulanan",
        lead: `Rata-rata ${fmt(Math.round(dataMonths.reduce((sum, m) => sum + m.total, 0) / Math.max(dataMonths.length, 1)))} insiden per bulan sejak ${monthName(noc.firstMonthWithData)}.`,
        charts: [{
          kind: "bar",
          title: "Insiden per bulan",
          categories: dataMonths.map(m => m.label),
          series: [
            { name: "Total insiden", values: dataMonths.map(m => m.total) },
            { name: "Selesai oleh sistem", values: dataMonths.map(m => m.bySystem) },
            { name: "Selesai oleh tim maintenance", values: dataMonths.map(m => m.resolved - m.bySystem) },
          ],
        }],
        note: `${pct(t.resolvedBySystem, t.total)} tiket ditutup otomatis oleh sistem saat perangkat kembali daring.`,
      },
      {
        title: "Insiden per Jenis Perangkat",
        lead: `${mainTypes.slice(0, 3).map(g => g.type).join(", ")} menyumbang ${pct(mainTypes.slice(0, 3).reduce((sum, g) => sum + g.incidents, 0), t.total)} insiden.`,
        charts: [{ kind: "hbar", title: "Jumlah insiden per jenis perangkat", unit: "insiden", legend: ["Selesai oleh sistem", "Selesai oleh tim maintenance"], rows: typeRows }],
      },
      {
        title: "Perangkat Paling Sering Bermasalah",
        lead: "Tiga perangkat dengan insiden terbanyak per jenis; kandidat perawatan preventif dan penggantian aset.",
        aside: {
          title: "Analisa: kenapa sering mati",
          items: [
            { title: "IP CCTV, AWK, IADEA", text: "KRL-141 gerbong 4: ketiganya mati bersamaan (±75 kali, ±594 jam). Satu sumber masalah per gerbong (daya atau jaringan lewat AWK), bukan tiga perangkat rusak." },
            { title: "Putus-sambung", text: "±80% insiden pulih sendiri: koneksi atau daya putus sementara, bukan rusak permanen." },
            { title: "ITA PC & MikroTik", text: "Mati bersamaan di KRL-69 dan KRL-120 gerbong 10. Indikasi catu daya atau kabel panel kabin; >55% butuh tim." },
            { title: "CCTV Recorder", text: "Rata-rata 91 jam hingga selesai, 68% butuh tim. Indikasi kerusakan HDD/recorder dan menunggu suku cadang." },
          ],
          note: "Hipotesis dari pola data NOC Mei–Okt 2026; perlu dicek di lapangan.",
        },
        charts: [{
          kind: "groups",
          title: "Tiga perangkat teratas per jenis",
          legend: ["Selesai oleh sistem", "Selesai oleh tim maintenance"],
          groups: mainTypes.map(g => ({
            title: g.type,
            meta: `${fmt(g.incidents)} insiden · ${fmt(g.bySystem)} sistem · ${fmt(g.byMaintenance)} maintenance`,
            rows: g.top.map(d => ({ label: d.name ?? "-", sub: `${(d.krl ?? "").toUpperCase()} · gerbong ${d.gerbong ?? "-"}`, value: d.count, parts: [d.bySystem, d.byMaintenance] })),
          })),
        }],
      },
    ],
  },
  {
    id: "gap",
    number: "03",
    section: "02 / EVALUASI KINERJA",
    title: "Kesenjangan Operasional",
    summary: ["Tiket masih dibuat manual", "Satu mobil untuk delapan depo", "Belum ada perawatan preventif"],
    icon: "⌁",
    highlights: [
      { label: "Tiket manual", value: manualShare },
      { label: "Mobilitas kru", value: "1 mobil/8 depo" },
      { label: "Preventif", value: "Belum ada" },
      { label: "SLA", value: "Belum berjalan" },
    ],
    pages: [
      {
        title: "Kesenjangan Operasional",
        lead: "Selisih antara kondisi saat ini dan target layar PID siap tayang setiap hari.",
        layout: "cards",
        fill: true,
        items: [
          {
            value: `${manualShare} tiket manual`,
            title: "Deteksi",
            points: [
              `Ping otomatis tiap ${pr.pingIntervalMinutes} menit sudah berjalan di NOC PID`,
              `Tiket belum terbit otomatis; ${manualShare} dibuat manual oleh petugas`,
              "Temuan kru dan klien dicatat terpisah di spreadsheet",
            ],
          },
          {
            value: `${ss.total} layar tercatat manual`,
            title: "Visibilitas",
            points: [
              "Ping hanya membuktikan perangkat daring, bukan layar tayang",
              "Layar mati, bergaris, atau redup tidak terdeteksi sistem",
              "CCTV tidak mencakup seluruh layar",
            ],
          },
          {
            value: "1 mobil / 8 depo",
            title: "Mobilitas",
            points: [
              "4 kru malam berbagi satu mobil untuk delapan depo",
              "Potensi cakupan hanya 1 depo per malam",
              "Pekerjaan yang tidak selesai di shift pagi/sore menumpuk ke shift malam",
            ],
          },
          {
            value: "945 insiden berulang",
            title: "Pencegahan",
            points: [
              "Belum ada jadwal perawatan preventif",
              "Penanganan dimulai setelah gangguan terjadi (reaktif)",
              "Kerusakan berulang pada perangkat yang sama belum ditindaklanjuti",
            ],
          },
          {
            value: `±${ss.avgDays} hari perbaikan layar`,
            title: "Suku cadang",
            points: [
              "Kebutuhan komponen masih dilaporkan kru secara manual",
              "Belum ada stok minimum, reservasi, dan keterlacakan nomor seri",
              `Perbaikan layar rata-rata ${ss.avgDays} hari hingga selesai`,
            ],
          },
          {
            value: "KPI ada, SLA belum berjalan",
            title: "Kendali layanan",
            points: [
              "KPI teknisi sudah ada di NOC PID, tetapi komponen SLA masih diisi tetap 100%",
              `Target SLA per prioritas sudah ada, namun ${mediumShare} tiket MEDIUM sehingga semua bertarget 12 jam`,
              "Rumus belum memisahkan waktu tunggu akses kereta dan suku cadang",
            ],
          },
        ],
      },
      {
        title: "Perhitungan KPI & SLA Saat Ini",
        lead: "KPI teknisi dihitung per bulan dari enam komponen; nilai lulus 80. Contoh kasus memakai Teknisi A (angka ilustrasi).",
        layout: "cards",
        fill: true,
        items: [
          { value: "Bobot 25%", title: "Kepatuhan SLA", points: ["Target selesai per prioritas: Critical 1 jam, High 4 jam, Medium 12 jam, Low 24 jam", "Saat ini nilainya diisi tetap 100% untuk semua teknisi"], example: "Tiket Medium dibuat 08.00, selesai 22.00 (14 jam) melewati target 12 jam, tetapi tetap dihitung memenuhi → 100 × 25% = 25 poin" },
          { value: "Bobot 30%", title: "Tiket selesai berbobot", points: ["Tiket selesai manual × bobot prioritas (Low 1, Medium 3, High 5, Critical 10)", "Dibanding target 300 tiket × 3 poin = 900 poin per bulan"], example: "Teknisi A menyelesaikan 120 tiket Medium: 120 × 3 = 360 dari 900 poin (40%) → 40 × 30% = 12 poin" },
          { value: "Bobot 15%", title: "Waktu respons", points: ["Dari tiket dibuat hingga ditugaskan ke teknisi", "Target Medium 2 jam (persentil 80 data Mei–Okt 2026)"], example: "Tiket dibuat 08.00, ditugaskan 09.30 (1,5 jam) → sesuai. 64 dari 80 pekerjaan sesuai (80%) → 12 poin" },
          { value: "Bobot 15%", title: "MTTR", points: ["Dari tiket ditugaskan hingga teknisi menyelesaikan pekerjaan", "Target sama dengan SLA: Medium 12 jam"], example: "Ditugaskan 09.30, dikerjakan kru malam dan selesai 23.30 (14 jam) → lewat target. 56 dari 80 pekerjaan sesuai (70%) → 10,5 poin" },
          { value: "Bobot 10%", title: "Dokumentasi", points: ["Catatan penyelesaian teknisi dianggap lengkap jika minimal 2 kata"], example: "Catatan \"Restart UPS\" lengkap, \"ok\" tidak. 72 dari 80 pekerjaan lengkap (90%) → 9 poin" },
          { value: "Bobot 5%", title: "Kendali tiket tertunda", points: ["Tiket berstatus tertunda lebih dari 24 jam mengurangi nilai"], example: "6 dari 120 tiket tertunda lebih dari 24 jam → 95% → 4,75 poin" },
        ],
        note: `Total Teknisi A: 25 + 12 + 12 + 10,5 + 9 + 4,75 = 73,25, di bawah nilai lulus 80. Belum ideal: SLA dipatok 100%, ${mediumShare} tiket berprioritas sama, waktu tunggu kereta dan suku cadang ikut terhitung.`,
        source: "Sumber: modul KPI Performance NOC PID",
      },
      {
        title: "Bukti dari Data NOC",
        lead: "Ping sudah otomatis, tetapi penerbitan tiket masih bergantung pada input manual NOC.",
        charts: [
          {
            kind: "donut",
            title: "Sumber pembuatan tiket",
            center: fmt(sourceTotal),
            segments: [
              { label: "Manual oleh petugas", value: noc.ticketSource.noc + noc.ticketSource.other },
              { label: "Otomatis oleh sistem", value: noc.ticketSource.system },
            ],
          },
          {
            kind: "donut",
            title: "Penutupan tiket selesai",
            center: fmt(t.resolved),
            segments: [
              { label: "Otomatis oleh sistem", value: t.resolvedBySystem },
              { label: "Oleh tim maintenance", value: t.resolved - t.resolvedBySystem },
            ],
          },
        ],
        note: "Tiket yang ditutup sistem perlu verifikasi tayangan agar layar benar-benar tampil.",
      },
    ],
  },
  {
    id: "framework",
    number: "04",
    section: "03 / PERBAIKAN STRATEGIS",
    title: "Kerangka Perbaikan 2027",
    icon: "▦",
    numbered: true,
    list: ["Pemantauan cerdas", "Mobilitas kru", "Perawatan preventif", "Kendali suku cadang", "Manajemen layanan", "Kesiapan klien 365"],
    highlights: [
      { label: "1. Pemantauan cerdas", value: "Peringatan otomatis" },
      { label: "2. Mobilitas kru", value: "1 teknisi/depo" },
      { label: "3. Perawatan preventif", value: "3 level" },
      { label: "4. Kendali suku cadang", value: "Stok terpantau" },
      { label: "5. Manajemen layanan", value: "SLA P1–P4" },
      { label: "6. Kesiapan klien 365", value: "Verifikasi tayang" },
    ],
    pages: [
      {
        title: "Kerangka Perbaikan 2027",
        lead: "Enam program, masing-masing menjawab satu kendala utama, agar layar PID siap tayang setiap hari.",
        layout: "cards",
        fill: true,
        items: [
          {
            value: "01",
            title: "Pemantauan cerdas",
            points: [
              "Tiket terbit otomatis dari hasil ping NOC PID",
              "AI menetapkan prioritas P1–P4 dan menggabungkan insiden terkait",
              "AI memverifikasi layar tayang (CCTV/telemetri) sebelum tiket ditutup",
            ],
            exampleLabel: "Menjawab",
            example: `${manualShare} tiket masih dibuat manual; ${pct(t.resolvedBySystem, t.total)} ditutup tanpa verifikasi tayang`,
          },
          {
            value: "02",
            title: "Mobilitas kru",
            points: [
              "1 teknisi tetap di masing-masing 6 depo pada shift pagi",
              "2 kru malam mobile untuk Kota, Bekasi, dan Cikarang",
              "Uji coba 1 bulan sebelum diterapkan penuh",
            ],
            exampleLabel: "Menjawab",
            example: "1 mobil untuk 8 depo; potensi hanya 1 depo per malam",
          },
          {
            value: "03",
            title: "Perawatan preventif",
            points: [
              "Tiga level: L1 jarak jauh (NOC), L2 pengecekan pagi, L3 pekerjaan berat malam",
              "Jadwal berbasis risiko, dimulai dari perangkat paling sering bermasalah",
              "Kepatuhan jadwal dipantau setiap bulan",
            ],
            exampleLabel: "Menjawab",
            example: `945 insiden berulang; ${mainTypes.slice(0, 3).map(g => g.type).join(", ")} menyumbang ${pct(mainTypes.slice(0, 3).reduce((sum, g) => sum + g.incidents, 0), t.total)} insiden`,
          },
          {
            value: "04",
            title: "Kendali suku cadang",
            points: [
              "Stok suku cadang masuk ke sistem NOC PID",
              "Kebutuhan dicatat di tiket dan stok direservasi otomatis",
              "Nomor seri tercatat dari pemasangan hingga pengembalian",
            ],
            exampleLabel: "Menjawab",
            example: `Perbaikan layar rata-rata ${ss.avgDays} hari; kebutuhan komponen masih dilaporkan manual`,
          },
          {
            value: "05",
            title: "Manajemen layanan",
            points: [
              "SLA P1–P4 dihitung dari data nyata, tidak dipatok 100%",
              "Waktu tunggu kereta masuk depo dan suku cadang dicatat sebagai jeda",
              "Eskalasi ke supervisor saat target hampir terlewati",
            ],
            exampleLabel: "Menjawab",
            example: `${mediumShare} tiket berprioritas MEDIUM; komponen SLA belum berjalan`,
          },
          {
            value: "06",
            title: "Kesiapan klien 365",
            points: [
              "Inspeksi acak rangkaian tanpa pemberitahuan",
              "Bukti tampilan layar wajib sebelum tiket ditutup",
              "Tinjauan mutu mingguan: keluhan, tiket, dan masalah berulang",
            ],
            exampleLabel: "Menjawab",
            example: `Klien masih menemukan layar mati; ${ss.total} layar bermasalah tercatat di luar tiket`,
          },
        ],
      },
      {
        title: "01 · Pemantauan Cerdas Berbasis AI",
        lead: "Tiket terbit dan diprioritaskan otomatis dengan AI; NOC beralih ke validasi, koordinasi, dan eskalasi.",
        layout: "cards",
        fill: true,
        items: [
          {
            value: "Sistem + AI",
            title: "Tiket otomatis & prioritas AI",
            points: [
              "Ping gagal beruntun langsung menerbitkan tiket",
              "AI menetapkan P1–P4 dari jumlah layar terdampak dan lokasinya",
              "Notifikasi otomatis ke kru lewat Telegram",
            ],
            exampleLabel: "Peran NOC",
            example: "Memvalidasi tiket yang ditandai AI ragu dan mengoreksi prioritas bila perlu",
          },
          {
            value: "AI",
            title: "Korelasi insiden",
            points: [
              "Perangkat down di satu gerbong/rangkaian digabung jadi satu insiden",
              "Dugaan akar masalah (MikroTik, daya) disertakan di tiket",
            ],
            exampleLabel: "Peran NOC",
            example: "Menugaskan satu tim per akar masalah, bukan per tiket",
          },
          {
            value: "AI",
            title: "Verifikasi tayangan",
            points: [
              "Computer vision membaca snapshot CCTV/telemetri",
              "Mendeteksi layar mati, bergaris, atau redup walau ping normal",
              "Tiket ditutup hanya setelah layar terbukti tayang",
            ],
            exampleLabel: "Peran NOC",
            example: "Meninjau hasil yang tidak yakin dan memutuskan pengiriman kru",
          },
          {
            value: "AI",
            title: "Prediksi gangguan",
            points: [
              "AI mempelajari pola ping: sering putus-sambung, latensi naik",
              "Perangkat berisiko masuk jadwal preventif sebelum rusak",
            ],
            exampleLabel: "Peran NOC",
            example: "Menyusun usulan perawatan preventif mingguan bersama supervisor",
          },
          {
            value: "Sudah ada, diperluas",
            title: "Asisten AI NOC",
            points: [
              "Chat analisis data NOC (AI Summary) sudah tersedia",
              "Diperluas: ringkasan shift otomatis, rekap SLA, rekomendasi suku cadang",
            ],
            exampleLabel: "Peran NOC",
            example: "Memakai ringkasan AI untuk serah terima shift dan laporan ke manajemen",
          },
          {
            value: "Sistem",
            title: "Kendali titik buta",
            points: [
              "Layar tanpa CCTV/telemetri ditandai sebagai titik buta",
              "Otomatis masuk jadwal: L2 pengecekan pagi sebelum berangkat, L3 pekerjaan berat oleh kru malam",
            ],
            exampleLabel: "Peran NOC",
            example: "Menjadwalkan dan memantau inspeksi fisik untuk layar titik buta",
          },
        ],
        note: `Peran NOC bergeser dari menerbitkan ±${manualPerPerson} tiket manual per orang per hari menjadi pengendali kualitas tiket, SLA, dan eskalasi.`,
      },
      {
        title: "02 · Optimalisasi Mobilitas Kru",
        lead: "Shift pagi mengecek layar di setiap depo sebelum kereta berangkat; shift malam menangani pekerjaan berat.",
        layout: "cards",
        fill: true,
        items: [
          {
            value: "Saat ini",
            title: "Tim terpusat",
            points: [
              "Shift pagi dan sore: masing-masing 1 ketua tim + 2 PKL",
              "Shift malam: 4 kru dengan 1 mobil untuk semua depo",
              "Hanya ±1 depo tertangani per malam; depo lain menunggu giliran",
            ],
            exampleLabel: "Dampak",
            example: `Rata-rata waktu tunggu 22 jam; perbaikan layar rata-rata ${ss.avgDays} hari`,
          },
          {
            value: "Usulan",
            title: "1 teknisi per depo",
            points: [
              "Pagi: 6 teknisi di Depok, Bogor, Serpong, Parung, Manggarai, Rangkas mengecek layar sebelum kereta berangkat",
              "Temuan ringan langsung ditangani; yang berat diteruskan ke shift malam",
              "Malam: 2 kru mobile mengerjakan perbaikan berat, termasuk di Kota, Bekasi, Cikarang",
            ],
            exampleLabel: "Hasil",
            example: "Layar dicek sebelum melayani penumpang; pekerjaan berat terjadwal malam dengan 1 mobil",
          },
          {
            value: "Kebutuhan SDM",
            title: "8 personel tetap per hari",
            points: [
              "Dibutuhkan 6 teknisi pengecekan pagi + 2 kru malam untuk pekerjaan berat",
              "Tersedia 6 personel tetap: 2 ketua tim + 4 kru malam",
              "4 PKL tetap sebagai pendamping, tidak dihitung personel tetap",
            ],
            exampleLabel: "Perlu tambahan",
            example: "2 teknisi baru agar keenam depo terisi",
          },
        ],
        note: "Asumsi: shift sore serta cadangan cuti/libur belum dihitung dan perlu dikonfirmasi. Usulan diuji 1 bulan sebelum diterapkan penuh.",
      },
      {
        title: "03 · Manajemen Perawatan Preventif",
        lead: "Pemeriksaan dibagi tiga level (L1–L3) menurut lokasi dan kedalamannya, tanpa mengorbankan perawatan korektif.",
        layout: "steps",
        items: [
          { value: "Level 1 (L1)", title: "Jarak jauh", text: "NOC memeriksa kesehatan perangkat dan meninjau anomali harian dari sistem, tanpa ke lapangan." },
          { value: "Level 2 (L2)", title: "Pengecekan pagi", text: "Teknisi depo mengecek tampilan dan fungsi layar setiap pagi sebelum kereta berangkat; perbaikan ringan langsung dikerjakan." },
          { value: "Level 3 (L3)", title: "Pekerjaan berat malam", text: "Kru malam memperbaiki dan mengganti perangkat, kabel, konektor, dan daya saat kereta masuk depo, sesuai izin." },
        ],
      },
      {
        title: "04 · Kendali Suku Cadang & Inventaris",
        lead: "Stok suku cadang masuk ke sistem NOC PID, sehingga kebutuhan, reservasi, dan riwayatnya terlihat di satu tempat.",
        layout: "cards",
        fill: true,
        items: [
          {
            value: "Baru di sistem",
            title: "Modul stok NOC PID",
            points: [
              "Barang masuk dicatat: jenis, jumlah, nomor seri, dan lokasi gudang/depo",
              "Stok per depo terhubung dengan data perangkat dan tiket",
              "Supervisor dan kru melihat stok dari aplikasi yang sama",
            ],
            exampleLabel: "Contoh",
            example: "10 adaptor AWK diterima → tercatat di stok Depok lengkap dengan nomor serinya",
          },
          {
            value: "Alur kerja",
            title: "Permintaan & reservasi",
            points: [
              "Kebutuhan komponen dicatat langsung di tiket",
              "Stok otomatis direservasi untuk kru yang ditugaskan",
              "Jika stok habis, tiket berstatus menunggu suku cadang",
            ],
            exampleLabel: "Contoh",
            example: "Tiket AWK gerbong 3 butuh 1 adaptor → stok Depok berkurang 1 dan disiapkan untuk kru malam",
          },
          {
            value: "Kendali",
            title: "Visibilitas & stok minimum",
            points: [
              "Dasbor stok aktual, stok minimum, dan permintaan terbuka",
              "Peringatan otomatis saat stok di bawah batas minimum",
              "AI merekomendasikan kebutuhan dari tren kerusakan per jenis perangkat",
            ],
            exampleLabel: "Contoh",
            example: "Stok IADEA tinggal 2 dari minimum 5 → supervisor menerima peringatan pengadaan",
          },
          {
            value: "Riwayat",
            title: "Keterlacakan",
            points: [
              "Nomor seri tercatat saat dipasang, dilepas, dan dikembalikan",
              "Riwayat penggantian tersimpan per perangkat",
              "Perangkat rusak dilacak hingga perbaikan atau klaim vendor",
            ],
            exampleLabel: "Contoh",
            example: "IP CCTV 1 di KRL-141 sudah diganti 3 kali → kandidat penggantian aset",
          },
        ],
        note: `Menjawab: perbaikan layar rata-rata ${ss.avgDays} hari dan kebutuhan komponen yang selama ini dilaporkan kru secara manual.`,
      },
      {
        title: "05 · SLA Internal & Manajemen Layanan",
        lead: "Prioritas ditentukan dari dampak ke penumpang: makin banyak layar mati, makin cepat target penanganannya.",
        layout: "stats",
        items: [
          { value: "4 jam", title: "P1 · Kritis", points: ["Semua layar di satu rangkaian (KA) mati", "Contoh: ITA PC atau MikroTik rangkaian down", "Ditangani paling dulu, eskalasi langsung ke supervisor"] },
          { value: "12 jam", title: "P2 · Tinggi", points: ["Semua layar di satu kereta/gerbong mati", "Contoh: AWK atau IADEA gerbong down", "Kru dikirim pada kesempatan pertama kereta di depo"] },
          { value: "24 jam", title: "P3 · Sedang", points: ["Sebagian layar di satu kereta mati, bergaris, atau redup", "Kereta masih punya layar yang tayang", "Dikerjakan sesuai jadwal kru harian"] },
          { value: "72 jam", title: "P4 · Rendah", points: ["Gangguan di luar layar, tayangan tidak terdampak", "Contoh: satu IP CCTV atau perangkat pendukung", "Digabung dengan perawatan preventif"] },
        ],
        note: "Target dihitung dari tiket dibuat hingga layar terverifikasi tayang kembali. Ini target internal awal, bukan komitmen kontraktual; alasan tunggu dan eskalasi dicatat untuk semua prioritas.",
      },
      {
        title: "06 · Kesiapan Klien 365",
        lead: "Media siap diperiksa kapan saja tanpa pemberitahuan.",
        layout: "cards",
        items: [
          { title: "Inspeksi acak", text: "Sampel rangkaian diperiksa rutin tanpa pemberitahuan khusus." },
          { title: "Verifikasi pascaperbaikan", text: "Validasi fungsi dan bukti tampilan sebelum tiket ditutup." },
          { title: "Tinjauan mutu mingguan", text: "Rekonsiliasi keluhan, tiket, dan masalah berulang; tindak lanjuti temuan." },
        ],
      },
    ],
  },
  {
    id: "kpi",
    number: "05",
    section: "04 / RENCANA PELAKSANAAN",
    title: "Target Kinerja 2027",
    summary: ["Ketersediaan layar ≥ 99%", "Tiket otomatis ≥ 90%", "Kepatuhan SLA ≥ 90%"],
    icon: "◎",
    highlights: [
      { label: "Ketersediaan layar", value: "≥ 99%" },
      { label: "Tiket otomatis", value: "≥ 90%" },
      { label: "Kepatuhan SLA", value: "≥ 90%" },
      { label: "Waktu tunggu", value: "−40%" },
      { label: "Keluhan klien", value: "−80%" },
    ],
    pages: [
      {
        title: "Target Kinerja 2027",
        lead: "Setiap target diukur dari sistem NOC PID, dengan kondisi 2026 sebagai titik awal.",
        layout: "stats",
        fill: true,
        items: [
          { value: "≥ 99%", title: "Ketersediaan layar", points: ["Diukur dari verifikasi tayang (AI/CCTV) per jam tayang"], exampleLabel: "Kondisi 2026", example: "Belum terukur; ping hanya membuktikan perangkat daring" },
          { value: "≥ 90%", title: "Tiket terbit otomatis", points: ["Diukur dari sumber tiket di NOC PID"], exampleLabel: "Kondisi 2026", example: `${pct(noc.ticketSource.system, sourceTotal)} otomatis; ${manualShare} dibuat manual` },
          { value: "100%", title: "Tiket ditutup dengan bukti tayang", points: ["Diukur dari status verifikasi di tiket"], exampleLabel: "Kondisi 2026", example: `${pct(t.resolvedBySystem, t.total)} ditutup otomatis saat ping pulih, tanpa bukti` },
          { value: "≥ 90%", title: "Kepatuhan SLA P1–P4", points: ["Diukur di modul KPI; waktu tunggu kereta dan suku cadang dikecualikan"], exampleLabel: "Kondisi 2026", example: `Belum berjalan: dipatok 100%, ${mediumShare} tiket MEDIUM` },
          { value: "−40% / −30%", title: "Waktu tunggu / penyelesaian", points: ["Target ≤ 13 jam tunggu dan ≤ 8,5 jam penyelesaian"], exampleLabel: "Kondisi 2026", example: "22 jam tunggu; 12 jam 9 menit penyelesaian" },
          { value: "−50% / −80%", title: "Masalah berulang / keluhan klien", points: ["Target ≤ 472 insiden berulang dan ≤ 1 keluhan per bulan"], exampleLabel: "Kondisi 2026", example: "945 insiden berulang; 5 keluhan klien (November)" },
          { value: "100%", title: "Pengecekan pagi & preventif", points: ["6 depo dicek setiap pagi sebelum kereta berangkat; jadwal preventif dipatuhi"], exampleLabel: "Kondisi 2026", example: "Belum ada pengecekan terjadwal maupun preventif" },
          { value: "100%", title: "Keterlacakan suku cadang", points: ["Nomor seri, reservasi, dan pemakaian tercatat di modul stok NOC PID"], exampleLabel: "Kondisi 2026", example: `Belum ada modul stok; perbaikan layar rata-rata ${ss.avgDays} hari` },
        ],
        note: "Target masih usulan dan perlu divalidasi setelah data dasar 2027 terkumpul.",
      },
    ],
  },
  {
    id: "roadmap",
    number: "06",
    section: "04 / RENCANA PELAKSANAAN",
    title: "Peta Jalan & Dukungan Manajemen",
    summary: ["Tahapan kuartal 1–4 tahun 2027", "Keputusan yang dibutuhkan"],
    icon: "◷",
    highlights: [
      { label: "Kuartal 1", value: "Membangun kendali" },
      { label: "Kuartal 2", value: "Implementasi" },
      { label: "Kuartal 3", value: "Optimalisasi" },
      { label: "Kuartal 4", value: "Standardisasi" },
    ],
    pages: [
      {
        title: "Peta Jalan Implementasi 2027",
        lead: "Tahapan implementasi sepanjang 2027.",
        layout: "steps",
        items: [
          { value: "Kuartal 1", title: "Membangun kendali", text: "Data dasar, SOP, uji coba mobilitas, perawatan preventif, dan kendali stok.", points: ["Sistem: penyesuaian kategori dan prioritas tiket, data dasar layar per rangkaian", "Stok: inventarisasi suku cadang dan penetapan stok minimum per depo", "SDM: sosialisasi SOP dan jadwal uji coba mobilitas kru"] },
          { value: "Kuartal 2", title: "Implementasi", text: "Penerapan pemantauan, mobilitas, dan perawatan preventif berdasarkan hasil uji coba.", points: ["Sistem: peringatan otomatis dan integrasi tiket ke NOC", "Stok: pengisian ulang sesuai stok minimum, pencatatan keluar-masuk barang", "Operasional: jadwal preventif berjalan di semua depo"] },
          { value: "Kuartal 3", title: "Optimalisasi", text: "Evaluasi kapasitas, keandalan, dan peremajaan aset prioritas.", points: ["Sistem: penyesuaian ambang peringatan dari data gangguan berulang", "Stok: revisi stok minimum berdasarkan pemakaian nyata", "Aset: daftar perangkat prioritas untuk diganti"] },
          { value: "Kuartal 4", title: "Standardisasi", text: "Evaluasi KPI, audit kualitas, dan standardisasi proses.", points: ["Sistem: laporan KPI bulanan otomatis dan uji verifikasi tampilan", "Stok: audit fisik suku cadang dan rekonsiliasi dengan sistem", "Proses: pembaruan SOP dan rencana kerja 2028"] },
        ],
      },
      {
        title: "Anggaran & Dukungan Manajemen",
        lead: "Ringkasan usulan tambahan; klik kartu biaya di bawah untuk rinciannya.",
        layout: "cards",
        items: [
          { value: "+2 teknisi", title: "Mobilitas & SDM", text: "Tambahan 2 teknisi dan penempatan teknisi tetap per depo." },
          { value: "+ Layanan AI", title: "Teknologi", text: "AI untuk peringatan dini, integrasi tiket, dan rekomendasi kebutuhan stok." },
          { value: "+ Suku cadang", title: "Sumber daya perawatan", text: "Stok suku cadang: CCTV, NVR, switch, MikroTik, splitter HDMI, dan adaptor." },
          { value: "Tanpa biaya tambahan", title: "Tata kelola", text: "Persetujuan target internal, akses depo, dan tinjauan KPI bulanan." },
        ],
        totals: [
          {
            label: "Capex",
            value: "± Rp2.048,3 jt",
            text: "Suku cadang: CCTV, NVR, switch, MikroTik, splitter, adaptor",
            detail: {
              definition: "Belanja modal: pembelian perangkat utuh yang dicatat sebagai aset, dipasang di kereta dan dipakai lebih dari 1 tahun. Nilainya disusutkan, bukan langsung menjadi biaya.",
              rows: [
                { label: "CCTV", sub: "Vport P06-MP-M12-CAM36 · 50 pcs × Rp22.995.057", value: "Rp1.149.752.850" },
                { label: "NVR", sub: "V2616A · 10 pcs × Rp80.000.000", value: "Rp800.000.000" },
                { label: "Switch Dahua", sub: "DH-CS4010-8ET-60 · 50 pcs × Rp1.050.000", value: "Rp52.500.000" },
                { label: "Splitter HDMI", sub: "Gain Tech 2 port · 50 pcs × Rp495.000", value: "Rp24.750.000" },
                { label: "MikroTik", sub: "RB450Gx · 10 pcs × Rp1.875.000", value: "Rp18.750.000" },
                { label: "Adaptor MikroTik", sub: "Adaptor 24V · 50 pcs × Rp25.000", value: "Rp1.250.000" },
                { label: "Adaptor Ubiquiti", sub: "Adaptor 24V 0,5A · 50 pcs × Rp25.000", value: "Rp1.250.000" },
                { label: "Total capex", value: "Rp2.048.252.850", total: true },
              ],
              note: "Jenis, harga, dan jumlah dari daftar kebutuhan suku cadang; belum termasuk pajak dan ongkos kirim.",
            },
          },
          {
            label: "Opex per tahun",
            value: "± Rp101,5 jt",
            text: "Gaji Rp96 jt + AI Rp5,52 jt",
            detail: {
              definition: "Biaya operasional: pengeluaran rutin yang habis dalam tahun berjalan dan langsung dicatat sebagai biaya.",
              rows: [
                { label: "Gaji 2 teknisi", sub: "Rp4.000.000 × 2 orang × 12 bulan, gaji bersih", value: "Rp96.000.000" },
                { label: "Token AI", sub: "US$25 × kurs Rp18.400 × 12 bulan", value: "Rp5.520.000" },
                { label: "Total opex", value: "Rp101.520.000", total: true },
              ],
              note: "Biaya rutin di luar pembelian suku cadang.",
            },
          },
          {
            label: "Total tanpa stok",
            value: "± Rp101,5 jt",
            text: "Gaji + AI saja; ±Rp8,5 jt per bulan",
            detail: {
              definition: "Pengeluaran minimum bila tidak membeli suku cadang.",
              rows: [
                { label: "Gaji 2 teknisi", value: "Rp96.000.000" },
                { label: "Token AI", value: "Rp5.520.000" },
                { label: "Total per tahun", value: "Rp101.520.000", total: true },
                { label: "Rata-rata per bulan", value: "Rp8.460.000" },
              ],
              note: "Tanpa stok, perbaikan tetap bergantung pada suku cadang yang tersedia saat ini.",
            },
          },
          {
            label: "Total dengan stok",
            value: "± Rp2.149,8 jt",
            text: "Capex + opex dalam 1 tahun",
            main: true,
            detail: {
              definition: "Seluruh dana yang keluar dalam 1 tahun untuk perbaikan dan penyesuaian.",
              rows: [
                { label: "Capex", sub: "Suku cadang termasuk adaptor", value: "Rp2.048.252.850" },
                { label: "Opex", sub: "Gaji dan token AI", value: "Rp101.520.000" },
                { label: "Total per tahun", value: "Rp2.149.772.850", total: true },
              ],
              note: "Belum termasuk pajak dan ongkos kirim; kurs Rp18.400/US$ (26 Nov 2026).",
            },
          },
        ],
        note: "Suku cadang dari daftar kebutuhan (jenis, harga, jumlah). Asumsi: gaji teknisi Rp4 jt/bulan bersih; kurs Rp18.400/US$; belum termasuk pajak dan ongkir.",
      },
    ],
  },
];
