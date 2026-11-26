"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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

// Sapaan sesuai jam lokal perangkat (menggantikan jam di layar awal).
const greeting = (d: Date) => {
  const h = d.getHours();
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
};

type VoiceResult = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  onresult: ((event: VoiceResult) => void) | null;
  onaudiostart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  abort: () => void;
};

const localVoiceOptions = { langs: ["id-ID"], processLocally: true };

type RecognitionConstructor = {
  new (): Recognition;
  available?: (options: typeof localVoiceOptions) => Promise<string>;
  install?: (options: typeof localVoiceOptions) => Promise<boolean>;
};

type RecognitionWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

function getRecognition() {
  const browser = window as RecognitionWindow;
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

function ensureFullscreen() {
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    void document.documentElement.requestFullscreen().catch(() => {});
  }
}

export default function Home() {
  const [open, setOpen] = useState<{ tile: number; page: number } | null>(null);
  const [showThanks, setShowThanks] = useState(false);
  const [closing, setClosing] = useState(false);
  const [clip, setClip] = useState("inset(0)");
  // Layar awal gaya lock screen Windows 8: "intro" -> "leaving" (layar terangkat) -> "done" (halaman tile).
  const [intro, setIntro] = useState<"intro" | "leaving" | "done">("intro");
  const recognition = useRef<Recognition | null>(null);
  const voiceCommand = useRef<(command: string) => void>(() => {});
  const voiceMuted = useRef(false);
  const localVoiceReady = useRef(false);
  const restartVoice = useRef<number | undefined>(undefined);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [offerLocalVoice, setOfferLocalVoice] = useState(false);
  const [installingVoice, setInstallingVoice] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (intro === "done") return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [intro]);

  const startVoice = useCallback(() => {
    if (recognition.current || voiceMuted.current) return;
    const SpeechRecognition = getRecognition();
    if (!SpeechRecognition) {
      setVoiceError("Kontrol suara belum didukung di browser ini.");
      return;
    }

    const session = new SpeechRecognition();
    session.lang = localVoiceOptions.langs[0];
    session.continuous = true;
    session.interimResults = true;
    if (localVoiceReady.current) session.processLocally = true;
    const fail = (message: string) => {
      recognition.current = null;
      setVoiceStatus("");
      setVoiceError(message);
    };
    const start = () => {
      if (recognition.current !== session) return;
      setVoiceStatus("Menunggu mikrofon…");
      try {
        session.start();
      } catch {
        fail("Kontrol suara gagal dimulai. Tekan ikon mikrofon untuk mencoba lagi.");
      }
    };

    session.onaudiostart = () => {
      if (recognition.current === session) setVoiceStatus("Mendengarkan · Lanjut / Kembali");
    };
    // Perintah dieksekusi dari hasil sementara (interim) begitu kata "lanjut"/"kembali" terdengar,
    // tanpa menunggu hasil final. Jumlah perintah yang sudah dijalankan dicatat per hasil
    // agar kata yang sama tidak terpicu dua kali saat transkrip diperbarui.
    const fired = new Map<number, number>();
    session.onresult = ({ resultIndex, results }) => {
      if (recognition.current !== session) return;
      for (let index = resultIndex; index < results.length; index++) {
        const phrase = results[index][0].transcript.toLowerCase().replace(/[^a-z ]/g, " ").trim();
        // Pengenal suara sering menulis "kembali" sebagai "kembalikan", "gembali", "balik", dll.
        const commands = phrase.split(/\s+/).flatMap((word) =>
          /^(lanjut|next)/.test(word) ? ["next"]
            : /^(kemba|gemba|balik|mundur|back)/.test(word) ? ["back"] : [],
        );
        const done = fired.get(index) ?? 0;
        for (const command of commands.slice(done)) {
          voiceCommand.current(command);
          setVoiceStatus(command === "next" ? "Lanjut · Mendengarkan" : "Kembali · Mendengarkan");
        }
        if (commands.length <= done && phrase) {
          setVoiceStatus(`Terdengar “${phrase.slice(0, 48)}” · Ucapkan Lanjut atau Kembali`);
        }
        fired.set(index, Math.max(done, commands.length));
      }
    };
    session.onend = () => {
      if (recognition.current !== session) return;
      fired.clear();
      start();
    };
    session.onerror = ({ error }) => {
      if (recognition.current !== session) return;
      // Gangguan sesaat: biarkan onend langsung menyambungkan ulang.
      if (error === "no-speech" || error === "aborted") return;
      const messages: Record<string, string> = {
        "not-allowed": "Izinkan mikrofon di pengaturan situs. Jika dibuka lewat pratinjau, buka presentasi di tab browser.",
        "service-not-allowed": "Layanan pengenal suara diblokir oleh browser.",
        "audio-capture": "Mikrofon tidak tersedia. Periksa perangkat input audio.",
        network: "Layanan pengenal suara tidak dapat dijangkau.",
      };
      fail(messages[error] ?? "Kontrol suara terputus. Tekan ikon mikrofon untuk mencoba lagi.");
    };

    setVoiceError("");
    recognition.current = session;
    start();
  }, []);

  useEffect(() => {
    let active = true;
    const autoStart = window.setTimeout(async () => {
      const capability = await getRecognition()?.available?.(localVoiceOptions).catch(() => undefined);
      if (!active) return;
      setOfferLocalVoice(capability === "downloadable" || capability === "downloading");
      localVoiceReady.current = capability === "available";
      startVoice();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(autoStart);
      window.clearTimeout(restartVoice.current);
      const session = recognition.current;
      recognition.current = null;
      session?.abort();
    };
  }, [startVoice]);

  const enter = useCallback(() => {
    if (intro !== "intro") return;
    startVoice();
    ensureFullscreen();
    setIntro("leaving");
    window.setTimeout(() => setIntro("done"), 700);
  }, [intro, startVoice]);

  useEffect(() => {
    if (intro !== "intro") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.target instanceof HTMLButtonElement) return;
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

  const openTile = useCallback((index: number) => { setClip(tileClip(index)); setClosing(false); setOpen({ tile: index, page: 0 }); }, []);

  const close = useCallback(() => {
    if (!open || closing) return;
    setClip(tileClip(open.tile));
    setClosing(true);
    window.setTimeout(() => { setOpen(null); setClosing(false); }, 380);
  }, [open, closing]);

  // Navigasi detail kembali ke menu di batas topik, atau lanjut ke penutup di akhir topik terakhir.
  const step = useCallback((dir: number) => {
    if (!open || closing) return;
    if (dir > 0) ensureFullscreen();
    const next = open.page + dir;
    if (next >= 0 && next < tiles[open.tile].pages.length) setOpen({ ...open, page: next });
    else if (dir > 0 && open.tile === tiles.length - 1) {
      setOpen(null);
      setShowThanks(true);
    } else close();
  }, [open, close, closing]);

  useEffect(() => {
    if (!open && !showThanks) return;
    const onKey = (e: KeyboardEvent) => {
      if (showThanks) {
        if (e.key === "Escape" || e.key === "ArrowLeft" || e.key === "PageUp") {
          e.preventDefault();
          setShowThanks(false);
        }
        return;
      }
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !(e.target instanceof HTMLButtonElement))) { e.preventDefault(); step(1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); step(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, showThanks, close, step]);

  useEffect(() => {
    voiceCommand.current = (command) => {
      if (showThanks) {
        if (command === "back") setShowThanks(false);
        return;
      }
      if (command === "next") {
        if (intro === "intro") enter();
        else if (open) step(1);
        else if (intro === "done") openTile(0);
      } else if (command === "back") {
        step(-1);
      }
    };
  }, [intro, enter, open, openTile, showThanks, step]);

  const installLocalVoice = async () => {
    const SpeechRecognition = getRecognition();
    if (!SpeechRecognition?.install || installingVoice) return;
    setInstallingVoice(true);
    try {
      if (!await SpeechRecognition.install(localVoiceOptions)) {
        setVoiceError("Paket pengenal suara gagal diunduh.");
        return;
      }
      setOfferLocalVoice(false);
      const session = recognition.current;
      recognition.current = null;
      window.clearTimeout(restartVoice.current);
      session?.abort();
      voiceMuted.current = false;
      localVoiceReady.current = true;
      startVoice();
    } catch {
      setVoiceError("Paket pengenal suara tidak dapat diunduh dari halaman ini.");
    } finally {
      setInstallingVoice(false);
    }
  };

  const toggleVoice = () => {
    const session = recognition.current;
    voiceMuted.current = Boolean(session);
    if (session) {
      recognition.current = null;
      window.clearTimeout(restartVoice.current);
      session.abort();
      setVoiceStatus("");
    } else {
      startVoice();
    }
  };

  const presentationControls = <div className="presentation-controls" onClick={event => event.stopPropagation()}>
    {(voiceError || voiceStatus) && <span className="voice-status" role="status">{voiceError || voiceStatus}
      {offerLocalVoice && <button type="button" className="local-voice-button" disabled={installingVoice} onClick={installLocalVoice}>{installingVoice ? "Mengunduh paket suara…" : "Aktifkan pengenalan lokal"}</button>}
    </span>}
    <button type="button" className="fullscreen-button" onClick={toggleVoice} aria-pressed={Boolean(voiceStatus)} aria-label="Kontrol suara" title={voiceStatus ? 'Ucapkan “Lanjut” atau “Kembali”. Klik untuk berhenti.' : "Aktifkan kontrol suara"}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-3 0h6"/></svg>
    </button>
    <button type="button" className="fullscreen-button" onClick={toggleFullscreen} aria-label="Ubah mode layar penuh" title="Layar penuh"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg></button>
  </div>;

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
      <div className="start-controls">{presentationControls}</div>
      <div className="start-brand">
        <small className="header-eyebrow">RENCANA STRATEGIS OPERASIONAL 2027 · PID / TV KERETA</small>
        <h1>PID Maintenance<br />Improvement Plan 2027</h1>
        <p className="start-dept">Operations &amp; Maintenance Department</p>
      </div>
      <div className="start-bottom">
        <div className="start-clock" suppressHydrationWarning>
          <strong>{now ? greeting(now) : "\u00a0"}</strong>
          <span>{now ? now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "\u00a0"}</span>
        </div>
        <button className="start-next" onClick={e => { e.stopPropagation(); enter(); }} aria-label="Masuk ke halaman utama">
          <span>Lanjut</span><Arrow />
        </button>
      </div>
    </section>}
    <header className="metro-header">
      <div><small className="header-eyebrow">RENCANA STRATEGIS OPERASIONAL 2027 · PID / TV KERETA</small><h1>PID Maintenance Improvement Plan 2027</h1></div>
      {intro === "done" && !open && !showThanks && presentationControls}
    </header>
    <div inert={intro !== "done" || Boolean(open) || showThanks} className="group-stage" aria-label="PID Maintenance Improvement Plan 2027">
      {renderGroup("Kondisi Saat Ini", "EVALUASI TAHUN 2026", 0, 3)}
      {renderGroup("Rencana Perbaikan", "ARAH PERBAIKAN TAHUN 2027", 3, 6)}
    </div>

    {intro === "done" && !open && !showThanks && <button type="button" className="start-next closing-link" onClick={() => setShowThanks(true)} aria-label="Buka halaman penutup">
      <span>Penutup</span><Arrow />
    </button>}

    {showThanks && <section className="start-screen thanks-screen" role="dialog" aria-modal="true" aria-labelledby="thanks-title">
      <div className="start-controls">{presentationControls}</div>
      <div className="thanks-copy">
        <h2 id="thanks-title">Terima Kasih</h2>
        <div className="thanks-quote">
          <blockquote>“Kita yakin tahun depan akan lebih baik karena kita mulai memperbaikinya hari ini, dengan semangat untuk melangkah, konsistensi untuk merawat, dan tanggung jawab untuk menuntaskan.”</blockquote>
        </div>
      </div>
      <button type="button" autoFocus className="start-next" onClick={() => setShowThanks(false)}><Arrow direction="left" /><span>Kembali</span></button>
    </section>}

    {open && tile && page && <section className={`detail-page tile-color-${open.tile} ${closing ? "closing" : ""}`} style={{ "--clip-from": clip } as CSSProperties} role="dialog" aria-modal="true" aria-label={page.title}>
      <header className="detail-head">
        <small>{tile.section}</small>
        <div className="presentation-controls">
          {presentationControls}
          <button className="detail-close" onClick={close} aria-label="Tutup detail">×</button>
        </div>
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
          <button onClick={() => step(-1)} aria-label="Kembali"><Arrow direction="left" /></button>
          <span>{tile.number} · {open.page + 1}/{tile.pages.length}</span>
          {open.page === tile.pages.length - 1 && open.tile === tiles.length - 1
            ? <button onClick={() => step(1)} aria-label="Buka halaman penutup" title="Penutup"><Arrow /></button>
            : open.page === tile.pages.length - 1
            ? <button onClick={() => step(1)} aria-label="Kembali ke halaman utama" title="Kembali ke halaman utama" className="nav-home">⌂</button>
            : <button onClick={() => step(1)} aria-label="Lanjut"><Arrow /></button>}
        </div>
      </footer>
    </section>}
  </main>;
}
