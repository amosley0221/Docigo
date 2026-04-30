import { useEffect, useState } from 'react';
import type {
  ChartDataPoint,
  ChartItemT,
  ChartType,
} from '../lib/types';
import { useStore } from '../state/store';
import { Icon, type IconName } from '../components/Icon';
import { uid } from '../lib/files';

const TYPE_LABEL: Record<ChartType, string> = {
  bar: 'Bar',
  line: 'Line',
  pie: 'Pie',
};

const TYPE_ICON: Record<ChartType, IconName> = {
  bar: 'chart-bar',
  line: 'chart-line',
  pie: 'chart-pie',
};

const PALETTE = [
  '#6788ff',
  '#aa3bff',
  '#ff5e7a',
  '#22b8a6',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#e879f9',
  '#fb7185',
  '#a3e635',
];

export function ChartViewer({ item }: { item: ChartItemT }) {
  const store = useStore();
  const data = item.data;

  const update = (patch: Partial<Omit<ChartItemT, 'id' | 'kind'>>) => {
    store.updateChart(item.id, patch);
  };

  const setData = (next: ChartDataPoint[]) => update({ data: next });

  return (
    <div className="flex h-full overflow-auto p-4">
      <div className="glass mx-auto flex max-w-5xl flex-1 flex-col gap-4 rounded-2xl px-6 py-5 shadow-soft">
        <ChartHeader item={item} update={update} />

        <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
          <DataEditor
            data={data}
            onChange={setData}
            xLabel={item.xLabel ?? ''}
            yLabel={item.yLabel ?? ''}
            onAxisLabels={(xLabel, yLabel) => update({ xLabel, yLabel })}
            chartType={item.chartType}
          />
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-white/5 bg-black/20 p-4">
            {data.length === 0 ? (
              <div className="text-center text-sm text-ink-400">
                Add at least one data point on the left to render the chart.
              </div>
            ) : (
              <ChartCanvas item={item} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartHeader({
  item,
  update,
}: {
  item: ChartItemT;
  update: (patch: Partial<Omit<ChartItemT, 'id' | 'kind'>>) => void;
}) {
  const store = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  useEffect(() => setName(item.name), [item.name]);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim() && name !== item.name)
                store.renameItem(item.id, name.trim());
              else setName(item.name);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setName(item.name);
                setEditing(false);
              }
            }}
            className="w-full bg-transparent font-display text-xl font-bold tracking-tight text-white outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="font-display text-xl font-bold tracking-tight text-white hover:text-accent-200"
            title="Click to rename"
          >
            {item.name}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
        {(['bar', 'line', 'pie'] as ChartType[]).map((t) => (
          <button
            key={t}
            onClick={() => update({ chartType: t })}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              item.chartType === t
                ? 'bg-accent-500/30 text-white'
                : 'text-ink-300 hover:text-white'
            }`}
          >
            <Icon name={TYPE_ICON[t]} width={13} height={13} />
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

function DataEditor({
  data,
  onChange,
  xLabel,
  yLabel,
  onAxisLabels,
  chartType,
}: {
  data: ChartDataPoint[];
  onChange: (next: ChartDataPoint[]) => void;
  xLabel: string;
  yLabel: string;
  onAxisLabels: (xLabel: string, yLabel: string) => void;
  chartType: ChartType;
}) {
  const [labelDraft, setLabelDraft] = useState('');
  const [valueDraft, setValueDraft] = useState('');

  const add = () => {
    const label = labelDraft.trim();
    const value = Number(valueDraft);
    if (!label || !Number.isFinite(value)) return;
    onChange([...data, { id: uid('pt'), label, value }]);
    setLabelDraft('');
    setValueDraft('');
  };

  const updatePoint = (id: string, patch: Partial<ChartDataPoint>) => {
    onChange(data.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const remove = (id: string) => onChange(data.filter((p) => p.id !== id));

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        Data
      </div>
      <div className="space-y-1">
        {data.map((p, i) => (
          <div
            key={p.id}
            className="group flex items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.02] px-1.5 py-1"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <input
              value={p.label}
              onChange={(e) => updatePoint(p.id, { label: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
              placeholder="Label"
            />
            <input
              type="number"
              step="any"
              value={Number.isFinite(p.value) ? p.value : ''}
              onChange={(e) => {
                const v = Number(e.target.value);
                updatePoint(p.id, {
                  value: Number.isFinite(v) ? v : 0,
                });
              }}
              className="w-20 bg-transparent text-right tabular-nums text-sm text-white outline-none"
              placeholder="0"
            />
            <button
              onClick={() => remove(p.id)}
              className="rounded-md p-1 text-ink-400 opacity-0 transition hover:bg-red-500/15 hover:text-red-300 group-hover:opacity-100"
              title="Remove"
            >
              <Icon name="x" width={12} height={12} />
            </button>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex items-center gap-1.5"
      >
        <input
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          placeholder="New label"
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-sm text-white outline-none placeholder:text-ink-500 focus:border-accent-500/60"
        />
        <input
          type="number"
          step="any"
          value={valueDraft}
          onChange={(e) => setValueDraft(e.target.value)}
          placeholder="0"
          className="w-20 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-right tabular-nums text-sm text-white outline-none placeholder:text-ink-500 focus:border-accent-500/60"
        />
        <button type="submit" className="btn-primary py-1 text-xs">
          <Icon name="plus" width={12} height={12} />
          Add
        </button>
      </form>

      {chartType !== 'pie' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <div className="label">X label</div>
            <input
              value={xLabel}
              onChange={(e) => onAxisLabels(e.target.value, yLabel)}
              placeholder="(none)"
              className="input py-1 text-sm"
            />
          </div>
          <div>
            <div className="label">Y label</div>
            <input
              value={yLabel}
              onChange={(e) => onAxisLabels(xLabel, e.target.value)}
              placeholder="(none)"
              className="input py-1 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCanvas({ item }: { item: ChartItemT }) {
  const { chartType, data, xLabel, yLabel } = item;
  switch (chartType) {
    case 'bar':
      return <BarChart data={data} xLabel={xLabel} yLabel={yLabel} />;
    case 'line':
      return <LineChart data={data} xLabel={xLabel} yLabel={yLabel} />;
    case 'pie':
      return <PieChart data={data} />;
  }
}

const W = 560;
const H = 320;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 36;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const r = v / exp;
  let nice;
  if (r <= 1) nice = 1;
  else if (r <= 2) nice = 2;
  else if (r <= 5) nice = 5;
  else nice = 10;
  return nice * exp;
}

function ticks(max: number, count = 4): number[] {
  const step = max / count;
  const out: number[] = [];
  for (let i = 0; i <= count; i++) out.push(i * step);
  return out;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000)
    return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

function BarChart({
  data,
  xLabel,
  yLabel,
}: {
  data: ChartDataPoint[];
  xLabel?: string;
  yLabel?: string;
}) {
  const values = data.map((d) => d.value);
  const max = niceMax(Math.max(0, ...values));
  const tickValues = ticks(max);
  const barW = (PLOT_W / data.length) * 0.7;
  const slot = PLOT_W / data.length;

  return (
    <ChartFrame xLabel={xLabel} yLabel={yLabel}>
      {tickValues.map((t, i) => {
        const y = PAD_T + PLOT_H - (t / max) * PLOT_H;
        return (
          <g key={i}>
            <line
              x1={PAD_L}
              x2={PAD_L + PLOT_W}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray={i === 0 ? '0' : '3 3'}
            />
            <text
              x={PAD_L - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-ink-400"
              style={{ fontSize: 10 }}
            >
              {fmt(t)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = max === 0 ? 0 : (d.value / max) * PLOT_H;
        const x = PAD_L + i * slot + (slot - barW) / 2;
        const y = PAD_T + PLOT_H - h;
        const color = PALETTE[i % PALETTE.length];
        return (
          <g key={d.id}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={3}
              fill={color}
              opacity={0.9}
            />
            <text
              x={x + barW / 2}
              y={H - PAD_B + 14}
              textAnchor="middle"
              className="fill-ink-300"
              style={{ fontSize: 10 }}
            >
              {truncate(d.label, 12)}
            </text>
          </g>
        );
      })}
    </ChartFrame>
  );
}

function LineChart({
  data,
  xLabel,
  yLabel,
}: {
  data: ChartDataPoint[];
  xLabel?: string;
  yLabel?: string;
}) {
  const values = data.map((d) => d.value);
  const max = niceMax(Math.max(0, ...values));
  const tickValues = ticks(max);
  const stepX = data.length > 1 ? PLOT_W / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = PAD_L + i * stepX;
    const y = PAD_T + PLOT_H - (max === 0 ? 0 : (d.value / max) * PLOT_H);
    return { ...d, x, y };
  });
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  return (
    <ChartFrame xLabel={xLabel} yLabel={yLabel}>
      {tickValues.map((t, i) => {
        const y = PAD_T + PLOT_H - (t / max) * PLOT_H;
        return (
          <g key={i}>
            <line
              x1={PAD_L}
              x2={PAD_L + PLOT_W}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray={i === 0 ? '0' : '3 3'}
            />
            <text
              x={PAD_L - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-ink-400"
              style={{ fontSize: 10 }}
            >
              {fmt(t)}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6788ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6788ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {points.length > 1 && (
        <path
          d={`${path} L ${points[points.length - 1].x} ${PAD_T + PLOT_H} L ${points[0].x} ${PAD_T + PLOT_H} Z`}
          fill="url(#lineFill)"
        />
      )}
      {points.length > 1 && (
        <path d={path} fill="none" stroke="#94b2ff" strokeWidth={2} />
      )}
      {points.map((p, i) => (
        <g key={p.id}>
          <circle cx={p.x} cy={p.y} r={3.5} fill="#fff" />
          <circle cx={p.x} cy={p.y} r={5} fill="none" stroke="#94b2ff" />
          <text
            x={p.x}
            y={H - PAD_B + 14}
            textAnchor="middle"
            className="fill-ink-300"
            style={{ fontSize: 10 }}
          >
            {truncate(p.label, 12)}
          </text>
          {i === points.length - 1 && (
            <text
              x={p.x + 6}
              y={p.y - 6}
              className="fill-white"
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              {fmt(p.value)}
            </text>
          )}
        </g>
      ))}
    </ChartFrame>
  );
}

function ChartFrame({
  children,
  xLabel,
  yLabel,
}: {
  children: React.ReactNode;
  xLabel?: string;
  yLabel?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full max-h-[420px] w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <line
        x1={PAD_L}
        x2={PAD_L}
        y1={PAD_T}
        y2={PAD_T + PLOT_H}
        stroke="rgba(255,255,255,0.12)"
      />
      <line
        x1={PAD_L}
        x2={PAD_L + PLOT_W}
        y1={PAD_T + PLOT_H}
        y2={PAD_T + PLOT_H}
        stroke="rgba(255,255,255,0.12)"
      />
      {children}
      {xLabel && (
        <text
          x={PAD_L + PLOT_W / 2}
          y={H - 4}
          textAnchor="middle"
          className="fill-ink-400"
          style={{ fontSize: 11 }}
        >
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text
          x={12}
          y={PAD_T + PLOT_H / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${PAD_T + PLOT_H / 2})`}
          className="fill-ink-400"
          style={{ fontSize: 11 }}
        >
          {yLabel}
        </text>
      )}
    </svg>
  );
}

function PieChart({ data }: { data: ChartDataPoint[] }) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  const cx = W / 2;
  const cy = H / 2 - 10;
  const r = Math.min(W, H) / 2.7;

  if (total <= 0) {
    return (
      <ChartFrame>
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          className="fill-ink-400"
          style={{ fontSize: 12 }}
        >
          All values are zero.
        </text>
      </ChartFrame>
    );
  }

  let acc = 0;
  return (
    <ChartFrame>
      {data.map((d, i) => {
        const v = Math.max(0, d.value);
        const startAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
        acc += v;
        const endAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
        const large = endAngle - startAngle > Math.PI ? 1 : 0;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
        const midAngle = (startAngle + endAngle) / 2;
        const lx = cx + (r + 14) * Math.cos(midAngle);
        const ly = cy + (r + 14) * Math.sin(midAngle);
        const pct = (v / total) * 100;
        return (
          <g key={d.id}>
            <path d={path} fill={PALETTE[i % PALETTE.length]} opacity={0.9} />
            {pct >= 4 && (
              <text
                x={lx}
                y={ly}
                textAnchor={lx > cx ? 'start' : 'end'}
                className="fill-ink-200"
                style={{ fontSize: 11 }}
              >
                {truncate(d.label, 14)} · {pct.toFixed(0)}%
              </text>
            )}
          </g>
        );
      })}
    </ChartFrame>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
