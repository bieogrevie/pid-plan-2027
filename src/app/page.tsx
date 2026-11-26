"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { nocSnapshot, tiles, type DetailPage } from "./content";
import { ChartBlock } from "./charts";

function Arrow({ direction = "right" }: { direction?: "right" | "left" }) {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className={direction === "left" ? "arrow arrow-left" : "arrow"}><path d="M3.5 10h12M10 4.5l5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

// Clip-path inset yang menutupi posisi tile di layar, dipakai sebagai titik awal/akhir animasi zoom.
function tileClip(index: number) {
  const el = document.querySelector<HTMLElement>(`[data-tile="${index}"]`);
  if (!el) return "inset(0)";
  const r = el.getBoundingClientRect();
  return `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px)`;
}

const columnsFor = (count: number) => (count <= 4 ? count : count % 3 === 0 ? 3 : 4);

function DetailBody({ page }: { page: DetailPage }) {
  return <>
    {page.items && <div className={`detail-items layout-${page.layout ?? "cards"}`} style={{ "--cols": columnsFor(page.items.length) } as CSSProperties}>
      {page.items.map((item, i) => <article key={i} className="detail-item">
        {item.value && <span className="detail-value">{item.value}</span>}
        {item.title && <h3>{item.title}</h3>}
        {item.text && <p>{item.text}</p>}
        {item.points && <ul className="detail-points">{item.points.map(pt => <li key={pt}>{pt}</li>)}</ul>}
        {item.example && <div className="detail-example"><span>{item.exampleLabel ?? "Contoh kasus"}</span><p>{item.example}</p></div>}
      </article>)}
    </div>}
    {page.charts && <div className="detail-charts" style={{ "--cols": page.charts.length } as CSSProperties}>
      {page.charts.map(chart => <ChartBlock key={chart.title} chart={chart} />)}
    </div>}
  </>;
}

export default function Home() {
  const [open, setOpen] = useState<{ tile: number; page: number } | null>(null);
  const [closing, setClosing] = useState(false);
  const [clip, setClip] = useState("inset(0)");
  // Layar awal gaya lock screen Windows 8: "intro" -> "leaving" (layar terangkat) -> "done" (halaman tile).
  const [intro, setIntro] = useState<"intro" | "leaving" | "done">("intro");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (intro === "done") return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [intro]);

  const enter = useCallback(() => {
    if (intro !== "intro") return;
    setIntro("leaving");
    window.setTimeout(() => setIntro("done"), 700);
  }, [intro]);

  useEffect(() => {
    if (intro !== "intro") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "PageDown") { e.preventDefault(); enter(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [intro, enter]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen can be blocked by browser permissions or an embedded preview.
    }
  };

  const openTile = (index: number) => { setClip(tileClip(index)); setClosing(false); setOpen({ tile: index, page: 0 }); };

  const close = useCallback(() => {
    if (!open) return;
    setClip(tileClip(open.tile));
    setClosing(true);
    window.setTimeout(() => { setOpen(null); setClosing(false); }, 380);
  }, [open]);

  // Navigasi antarhalaman dalam satu tile; lewat halaman terakhir (atau sebelum pertama) kembali ke home.
  const step = useCallback((dir: number) => {
    if (!open) return;
    const next = open.page + dir;
    if (next >= 0 && next < tiles[open.tile].pages.length) setOpen({ ...open, page: next });
    else close();
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); step(1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); step(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, step]);

  // Semua tile: muka depan = judul, saat hover bergeser ke ringkasan angka kunci.
  const renderTile = (index: number) => {
    const tile = tiles[index];
    return <div key={tile.id} data-tile={index} className={`metro-tile group-tile flip-card tile-color-${index}`} role="button" tabIndex={0} aria-label={`${tile.title}. Klik untuk melihat detail.`} onClick={() => openTile(index)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTile(index); } }}>
      <div className="flip-inner">
        <div className="flip-face flip-front">
          <span className="group-tile-icon" aria-hidden="true">{tile.icon}</span>
          <strong>{tile.title}</strong>
          {tile.list
            ? (() => { const List = tile.numbered ? "ol" : "ul"; return <List className={`summary-list ${tile.list.length > 5 ? "summary-columns" : ""} ${tile.numbered ? "numbered" : ""}`}>{tile.list.map(item => <li key={item}>{item}</li>)}</List>; })()
            : tile.summary && (tile.summary.length > 1
              ? <ul className="summary-points">{tile.summary.map(item => <li key={item}>{item}</li>)}</ul>
              : <small>{tile.summary[0]}</small>)}
        </div>
        <div className="flip-face flip-back">
          <strong>{tile.title}</strong>
          <table className="inventory-table"><tbody>{tile.highlights.map(h => <tr key={h.label}><td>{h.label}</td><td>{h.value}</td></tr>)}</tbody></table>
        </div>
      </div>
    </div>;
  };

  const renderGroup = (title: string, subtitle: string, start: number, end: number) => <section className="tile-group">
    <header className="group-heading"><span>{title}</span><small>{subtitle}</small></header>
    <div className="group-tiles">{Array.from({ length: end - start }, (_, i) => renderTile(start + i))}</div>
  </section>;

  const tile = open ? tiles[open.tile] : null;
  const page = tile && open ? tile.pages[open.page] : null;

  return <main className={`metro-shell ${intro === "done" ? "" : "pre-start"} ${intro === "leaving" ? "starting" : ""}`}>
    {intro !== "done" && <section className={`start-screen ${intro === "leaving" ? "leaving" : ""}`} aria-label="Layar awal" onClick={enter}>
      <div className="start-brand">
        <small className="header-eyebrow">RENCANA STRATEGIS OPERASIONAL 2027 · PID / TV KERETA</small>
        <h1>PID Maintenance<br />Improvement Plan 2027</h1>
      </div>
      <div className="start-bottom">
        <div className="start-clock" suppressHydrationWarning>
          <strong>{now ? now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "\u00a0"}</strong>
          <span>{now ? now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }) : "\u00a0"}</span>
        </div>
        <button className="start-next" onClick={e => { e.stopPropagation(); enter(); }} aria-label="Masuk ke halaman utama">
          <span>Next</span><Arrow />
        </button>
      </div>
    </section>}
    <header className="metro-header">
      <div><small className="header-eyebrow">RENCANA STRATEGIS OPERASIONAL 2027 · PID / TV KERETA</small><h1>PID Maintenance Improvement Plan 2027</h1></div>
      <button className="fullscreen-button" onClick={toggleFullscreen} aria-label="Tampilkan layar penuh" title="Layar penuh"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg></button>
    </header>
    <div className="group-stage" aria-label="PID Maintenance Improvement Plan 2027">
      {renderGroup("Kondisi Saat Ini", "EVALUASI TAHUN 2026", 0, 3)}
      {renderGroup("Rencana Perbaikan", "ARAH PERBAIKAN TAHUN 2027", 3, 6)}
    </div>

    {open && tile && page && <section className={`detail-page tile-color-${open.tile} ${closing ? "closing" : ""}`} style={{ "--clip-from": clip } as CSSProperties} role="dialog" aria-modal="true" aria-label={page.title}>
      <header className="detail-head">
        <small>{tile.section}</small>
        <button className="detail-close" onClick={close} aria-label="Tutup detail">×</button>
      </header>
      <div className={`detail-content ${page.charts ? "has-charts" : ""} ${page.charts && page.items ? "compact" : ""} ${page.fill ? "fill" : ""}`} key={`${open.tile}-${open.page}`}>
        <h2>{page.title}</h2>
        {page.lead && <p className="detail-lead">{page.lead}</p>}
        <DetailBody page={page} />
        {page.note && <p className="detail-note">{page.note}</p>}
      </div>
      <footer className="detail-foot">
        <span>{page.source ?? (page.charts ? nocSnapshot : "OPERASIONAL / RENCANA PERBAIKAN PERAWATAN PID 2027")}</span>
        <div className="detail-dots" aria-hidden="true">{tile.pages.map((_, i) => <i key={i} className={i === open.page ? "on" : ""} />)}</div>
        <div className="detail-nav">
          <button onClick={() => step(-1)} aria-label="Sebelumnya"><Arrow direction="left" /></button>
          <span>{tile.number} · {open.page + 1}/{tile.pages.length}</span>
          {open.page === tile.pages.length - 1
            ? <button onClick={() => step(1)} aria-label="Kembali ke halaman utama" title="Kembali ke halaman utama" className="nav-home">⌂</button>
            : <button onClick={() => step(1)} aria-label="Berikutnya"><Arrow /></button>}
        </div>
      </footer>
    </section>}
  </main>;
}
