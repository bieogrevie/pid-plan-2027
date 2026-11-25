"use client";

import { useState } from "react";

const slides = [
  {
    id: "overview", number: "", eyebrow: "EXISTING", title: "Inventaris perangkat",
    summary: "Jumlah rangkaian, gerbong, dan perangkat yang terpasang.",
    detail: "Daftar inventaris perangkat untuk mendukung pemetaan kebutuhan maintenance. Jumlah gerbong masih berupa placeholder dan dapat diperbarui setelah data final tersedia.",
    chips: ["Data terpisah", "Update manual", "Sulit ditelusuri"], metric: "01", metricLabel: "KONDISI EXISTING",
  },
  {
    id: "network", number: "02", eyebrow: "EXISTING", title: "Perawatan cenderung reaktif",
    summary: "Tindak lanjut sering dimulai setelah laporan gangguan diterima.",
    detail: "Contoh ini menggambarkan proses yang masih menunggu laporan gangguan sebelum tindakan dilakukan. Jadwal inspeksi dan prioritas risiko belum terlihat dalam satu alur kerja.",
    chips: ["Menunggu laporan", "Prioritas belum jelas", "Risiko downtime"], metric: "02", metricLabel: "KONDISI EXISTING",
  },
  {
    id: "audience", number: "03", eyebrow: "EXISTING", title: "Pelaporan belum terintegrasi",
    summary: "Status pekerjaan dan biaya sulit dipantau lintas tim.",
    detail: "Contoh dummy: progres pekerjaan, kebutuhan suku cadang, dan biaya perawatan dicatat pada laporan berbeda. Dampaknya, pemantauan membutuhkan rekap manual.",
    chips: ["Rekap manual", "Status terlambat", "Data terfragmentasi"], metric: "03", metricLabel: "KONDISI EXISTING",
  },
  {
    id: "formats", number: "04", eyebrow: "IMPROVEMENT", title: "Satu sumber data aset",
    summary: "Satukan profil aset, lokasi, jadwal, dan riwayat perawatan.",
    detail: "Bangun master data aset sebagai dasar pemantauan. Setiap aset memiliki identitas, lokasi, kondisi, dokumen, dan riwayat pekerjaan yang dapat ditelusuri.",
    chips: ["Master data", "Riwayat aset", "Akses terpusat"], metric: "01", metricLabel: "ARAH IMPROVEMENT",
  },
  {
    id: "packages", number: "05", eyebrow: "IMPROVEMENT", title: "Perawatan preventif terjadwal",
    summary: "Gunakan kalender inspeksi dan pengingat berdasarkan kondisi aset.",
    detail: "Rencanakan inspeksi berkala, tetapkan prioritas berdasarkan risiko, dan kirim pengingat sebelum jadwal jatuh tempo. Hasil inspeksi langsung tersimpan pada riwayat aset.",
    chips: ["Preventive schedule", "Reminder", "Prioritas risiko"], metric: "02", metricLabel: "ARAH IMPROVEMENT",
  },
  {
    id: "measurement", number: "06", eyebrow: "IMPROVEMENT", title: "Dashboard kinerja perawatan",
    summary: "Pantau progres, downtime, biaya, dan kepatuhan jadwal.",
    detail: "Dashboard menyajikan status pekerjaan dan indikator perawatan dalam satu tampilan. Metrik dan target perlu disepakati berdasarkan data operasional aktual.",
    chips: ["Status pekerjaan", "Downtime", "Biaya & KPI"], metric: "03", metricLabel: "ARAH IMPROVEMENT",
  },
];

function Arrow({ direction = "right" }: { direction?: "right" | "left" }) {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className={direction === "left" ? "arrow arrow-left" : "arrow"}><path d="M3.5 10h12M10 4.5l5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const active = slides[activeIndex];
  const go = (direction: number) => setActiveIndex((activeIndex + direction + slides.length) % slides.length);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen can be blocked by browser permissions or an embedded preview.
      // Keep the presentation usable without surfacing an unhandled rejection.
    }
  };

  const openDetail = (index: number) => { setActiveIndex(index); setShowDetail(true); };
  const renderGroup = (title: string, subtitle: string, startIndex: number, endIndex: number, colorClass: string) => <section className={`tile-group ${colorClass}`}><header className="group-heading"><span>{title}</span><small>{subtitle}</small></header><div className="group-tiles">{slides.slice(startIndex, endIndex).map((slide, offset) => { const index = startIndex + offset; const selected = activeIndex === index && showDetail; return index === 0 ? <div key={slide.id} className={`metro-tile group-tile flip-card tile-color-${index} ${selected ? "selected" : ""}`} role="button" tabIndex={0} aria-label="Inventaris perangkat. Arahkan kursor untuk melihat daftar perangkat." onClick={() => openDetail(index)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetail(index); } }}><div className="flip-inner"><div className="flip-face flip-front"><span className="group-tile-icon device-icon" aria-hidden="true">▣</span><strong>{slide.title}</strong><small>Arahkan kursor untuk melihat data</small></div><div className="flip-face flip-back"><strong>{slide.title}</strong><table className="inventory-table"><tbody><tr><td>JUMLAH RANGKAIAN</td><td>31</td></tr><tr><td>JUMLAH GERBONG</td><td>XXX</td></tr><tr className="inventory-spacer"><td colSpan={2}></td></tr><tr className="key-row"><td>ITA PC</td><td>31</td></tr><tr><td>CCTV RECORDER</td><td>31</td></tr><tr className="key-row"><td>Ip CCTV</td><td>412</td></tr><tr><td>AWK</td><td>355</td></tr><tr className="key-row"><td>IADEA</td><td>206</td></tr><tr><td>MIKROTIK</td><td>31</td></tr></tbody></table></div></div></div> : <button key={slide.id} className={`metro-tile group-tile tile-color-${index} ${selected ? "selected" : ""}`} onClick={() => openDetail(index)} aria-pressed={selected}><span className="group-tile-number">{slide.number}</span><span className="group-tile-icon">{index < 3 ? ["▦", "⌁", "▤"][index] : ["▣", "◷", "◉"][index - 3]}</span><strong>{slide.title}</strong><small>{slide.summary}</small></button>; })}</div></section>;

  return <main className="metro-shell"><header className="metro-header"><h1>PID Maintenance Improvement Plan 2027</h1><button className="fullscreen-button" onClick={toggleFullscreen} aria-label="Tampilkan layar penuh" title="Layar penuh"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg></button></header><div className="group-stage" aria-label="PID Maintenance Improvement Plan 2027">{renderGroup("Existing", "KONDISI SAAT INI", 0, 3, "existing-group")}{renderGroup("Improvement", "ARAH PERBAIKAN", 3, 6, "improvement-group")}</div>{showDetail && <><button className="drawer-backdrop" onClick={() => setShowDetail(false)} aria-label="Tutup detail"/><aside className={`detail-drawer ${activeIndex < 3 ? "drawer-existing" : "drawer-improvement"}`} aria-live="polite"><button className="drawer-close" onClick={() => setShowDetail(false)} aria-label="Tutup detail">×</button><small>{active.eyebrow} · {active.number}</small><h2>{active.title}</h2><p>{active.detail}</p><div className="detail-tags">{active.chips.map(chip => <span key={chip}>{chip}</span>)}</div></aside></>}</main>;
}
