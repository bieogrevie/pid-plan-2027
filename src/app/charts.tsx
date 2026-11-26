import type { Chart } from "./content";

// Grafik ringan berbasis SVG/HTML tanpa dependensi, warna mengikuti tema emas-putih.
const COLORS = ["var(--c1)", "var(--c2)", "var(--c3)"];
const fmt = (n: number) => n.toLocaleString("id-ID");
const pctOf = (part: number, whole: number) => `${(whole ? (part / whole) * 100 : 0).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;

function niceMax(value: number) {
  const pow = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  return Math.ceil(value / pow) * pow;
}

function Legend({ names }: { names: string[] }) {
  return <div className="chart-legend">{names.map((n, i) => <span key={n}><i style={{ background: COLORS[i] }} />{n}</span>)}</div>;
}

function BarChart({ chart }: { chart: Extract<Chart, { kind: "bar" }> }) {
  const W = 1400, H = 380, L = 64, B = 38, T = 52, GAP = 10;
  const max = niceMax(Math.max(...chart.series.flatMap(s => s.values)));
  const band = (W - L) / chart.categories.length;
  const barW = Math.min(64, (band * 0.62) / chart.series.length);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  return <>
    <Legend names={chart.series.map(s => s.name)} />
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={chart.title}>
      {[0, 0.25, 0.5, 0.75, 1].map(f => <g key={f}>
        <line x1={L} x2={W} y1={y(max * f)} y2={y(max * f)} className="chart-grid" />
        <text x={L - 10} y={y(max * f) + 5} textAnchor="end" className="chart-axis">{fmt(max * f)}</text>
      </g>)}
      {chart.categories.map((cat, ci) => {
        const x0 = L + band * ci + (band - barW * chart.series.length) / 2;
        const step = barW;
        return <g key={cat}>
          {chart.series.map((s, si) => {
            // Angka di atas tiap batang; seri selain total juga diberi persentase terhadap total bulan itu.
            const v = s.values[ci], bx = x0 + si * step + (si - 1) * GAP / 2, bw = barW - GAP / 2, cx = bx + bw / 2;
            return <g key={s.name}>
              <rect x={bx} y={y(v)} width={bw} height={y(0) - y(v)} style={{ fill: COLORS[si] }} />
              <text x={cx} y={y(v) - (si ? 22 : 8)} textAnchor="middle" className={si ? "chart-value small" : "chart-value"}>{fmt(v)}</text>
              {si > 0 && <text x={cx} y={y(v) - 7} textAnchor="middle" className="chart-pct">{pctOf(v, chart.series[0].values[ci])}</text>}
            </g>;
          })}
          <text x={L + band * ci + band / 2} y={H - 10} textAnchor="middle" className="chart-axis">{cat}</text>
        </g>;
      })}
    </svg>
  </>;
}

// Batang bertumpuk: tiap bagian (parts) diberi warna seri; sisanya (belum selesai) tetap terlihat di track.
function StackTrack({ value, max, parts }: { value: number; max: number; parts?: number[] }) {
  if (!parts) return <div className="hbar-track"><span style={{ width: `${(value / max) * 100}%` }} /></div>;
  return <div className="hbar-track stacked">{parts.map((p, i) => <span key={i} style={{ width: `${(p / max) * 100}%`, background: COLORS[i] }} />)}</div>;
}

// Rincian angka + persentase tiap bagian terhadap total baris.
function Split({ value, parts }: { value: number; parts: number[] }) {
  return <small className="hbar-split">{parts.map((p, i) => <span key={i}><i style={{ background: COLORS[i] }} />{fmt(p)} ({pctOf(p, value)})</span>)}</small>;
}

function HBarChart({ chart }: { chart: Extract<Chart, { kind: "hbar" }> }) {
  const max = Math.max(...chart.rows.map(r => r.value));
  return <>{chart.legend && <Legend names={chart.legend} />}<div className="hbar-list">
    {chart.rows.map(r => <div key={r.label + r.sub} className="hbar-row">
      <div className="hbar-label"><strong>{r.label}</strong>{r.sub && <small>{r.sub}</small>}</div>
      <StackTrack value={r.value} max={max} parts={r.parts} />
      <b>{fmt(r.value)}{r.parts && <Split value={r.value} parts={r.parts} />}</b>
    </div>)}
  </div></>;
}

function DonutChart({ chart }: { chart: Extract<Chart, { kind: "donut" }> }) {
  const total = chart.segments.reduce((s, x) => s + x.value, 0) || 1;
  const R = 70, C = 2 * Math.PI * R;
  let offset = 0;
  return <div className="donut">
    <svg viewBox="0 0 200 200" role="img" aria-label={chart.title}>
      <circle cx="100" cy="100" r={R} className="donut-bg" />
      {chart.segments.map((s, i) => {
        const len = (s.value / total) * C;
        const el = <circle key={s.label} cx="100" cy="100" r={R} style={{ stroke: COLORS[i] }} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} className="donut-seg" />;
        offset += len;
        return el;
      })}
      <text x="100" y="98" textAnchor="middle" className="donut-center">{chart.center}</text>
      <text x="100" y="122" textAnchor="middle" className="donut-caption">{chart.caption ?? "tiket"}</text>
    </svg>
    <ul className="donut-legend">
      {chart.segments.map((s, i) => <li key={s.label}><i style={{ background: COLORS[i] }} /><span>{s.label}</span><b>{pctOf(s.value, total)}</b><small>{fmt(s.value)}</small></li>)}
    </ul>
  </div>;
}

function GroupsChart({ chart }: { chart: Extract<Chart, { kind: "groups" }> }) {
  return <>{chart.legend && <Legend names={chart.legend} />}<div className="device-groups">
    {chart.groups.map(g => {
      const max = Math.max(...g.rows.map(r => r.value), 1);
      return <section key={g.title} className="device-group">
        <header><h4>{g.title}</h4><span>{g.meta}</span></header>
        <ol>{g.rows.map(r => <li key={r.label + r.sub}>
          <div className="dg-label"><strong>{r.label}</strong><small>{r.sub}</small></div>
          <b>{fmt(r.value)}{r.parts && <Split value={r.value} parts={r.parts} />}</b>
          <StackTrack value={r.value} max={max} parts={r.parts} />
        </li>)}</ol>
      </section>;
    })}
  </div></>;
}

export function ChartBlock({ chart }: { chart: Chart }) {
  return <figure className={`chart chart-${chart.kind}`}>
    <figcaption>{chart.title}</figcaption>
    {chart.kind === "bar" && <BarChart chart={chart} />}
    {chart.kind === "hbar" && <HBarChart chart={chart} />}
    {chart.kind === "donut" && <DonutChart chart={chart} />}
    {chart.kind === "groups" && <GroupsChart chart={chart} />}
  </figure>;
}
