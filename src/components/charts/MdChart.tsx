import { useMemo, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type ChartSeries = {
  key: string;
  name?: string;
  color?: string;
};

export type ChartSpec = {
  type?: 'bar' | 'line' | 'area';
  title?: string;
  caption?: string;
  xKey?: string;
  /** Shorthand: list of y-field keys. Prefer `series` for labels/colors. */
  yKeys?: string[];
  series?: ChartSeries[];
  data: Record<string, string | number>[];
  height?: number;
};

const PALETTE = ['#1f6feb', '#bf4a2e', '#2a7a4b', '#6b4ea2', '#b36b00', '#0f766e'];

function resolveSeries(spec: ChartSpec): ChartSeries[] {
  if (spec.series?.length) return spec.series;
  if (spec.yKeys?.length) return spec.yKeys.map((key) => ({ key, name: key }));
  if (!spec.data?.length) return [];
  const xKey = spec.xKey ?? 'name';
  return Object.keys(spec.data[0])
    .filter((k) => k !== xKey)
    .map((key) => ({ key, name: key }));
}

type Props = { spec: ChartSpec };

export default function MdChart({ spec }: Props) {
  const type = spec.type ?? 'bar';
  const xKey = spec.xKey ?? 'name';
  const height = spec.height ?? 280;
  const series = useMemo(() => resolveSeries(spec), [spec]);

  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e2dc" />
      <XAxis dataKey={xKey} tick={{ fill: '#6b6560', fontSize: 12 }} />
      <YAxis tick={{ fill: '#6b6560', fontSize: 12 }} />
      <Tooltip
        contentStyle={{
          background: '#fffdf8',
          border: '1px solid #e5e2dc',
          borderRadius: 4,
          fontSize: 13,
        }}
      />
      <Legend />
    </>
  );

  let body: ReactNode = null;
  if (type === 'line') {
    body = (
      <LineChart data={spec.data}>
        {common}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name ?? s.key}
            stroke={s.color ?? PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    );
  } else if (type === 'area') {
    body = (
      <AreaChart data={spec.data}>
        {common}
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name ?? s.key}
            stroke={s.color ?? PALETTE[i % PALETTE.length]}
            fill={s.color ?? PALETTE[i % PALETTE.length]}
            fillOpacity={0.15}
          />
        ))}
      </AreaChart>
    );
  } else {
    body = (
      <BarChart data={spec.data}>
        {common}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name ?? s.key}
            fill={s.color ?? PALETTE[i % PALETTE.length]}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    );
  }

  return (
    <figure className="md-chart-figure my-8">
      {spec.title ? (
        <figcaption className="mb-3 font-sans text-sm font-medium text-[var(--color-ink)]">
          {spec.title}
        </figcaption>
      ) : null}
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {body}
        </ResponsiveContainer>
      </div>
      {spec.caption ? (
        <figcaption className="mt-3 text-center font-serif text-sm text-[var(--color-muted)]">
          {spec.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
