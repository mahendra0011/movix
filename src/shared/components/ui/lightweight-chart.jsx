function TrendAreaChart({ data = [], valueKey, labelKey = "day", formatValue = formatPlain }) {
  const points = normalizeSeries(data, valueKey);
  const path = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = points.length
    ? `M ${points[0].x},100 L ${path} L ${points[points.length - 1].x},100 Z`
    : "";

  return (
    <div className="flex h-full min-h-64 flex-col">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="min-h-0 flex-1">
        <defs>
          <linearGradient id="lightweightTrendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.32" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#lightweightTrendFill)" />
        <polyline
          points={path}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground" style={gridStyle(data.length)}>
        {data.map((item, index) => (
          <div key={`${item[labelKey]}-${index}`} className="min-w-0">
            <p className="truncate">{item[labelKey]}</p>
            <p className="truncate font-medium text-foreground">{formatValue(item[valueKey])}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerticalBars({ data = [], valueKey, labelKey, formatValue = formatPlain }) {
  const max = Math.max(1, ...data.map((item) => Number(item[valueKey] || 0)));

  return (
    <div className="flex h-full min-h-64 flex-col justify-end gap-3">
      {data.length ? (
        data.map((item, index) => {
          const value = Number(item[valueKey] || 0);
          const width = Math.max(3, Math.round((value / max) * 100));

          return (
            <div key={`${item[labelKey]}-${index}`}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-muted-foreground">{item[labelKey]}</span>
                <span className="shrink-0 font-medium">{formatValue(value)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })
      ) : (
        <div className="grid flex-1 place-items-center rounded-lg border border-dashed border-border/70 text-sm text-muted-foreground">
          No chart data yet
        </div>
      )}
    </div>
  );
}

function normalizeSeries(data, valueKey) {
  const max = Math.max(1, ...data.map((item) => Number(item[valueKey] || 0)));
  const lastIndex = Math.max(1, data.length - 1);

  return data.map((item, index) => {
    const value = Number(item[valueKey] || 0);
    return {
      x: (index / lastIndex) * 100,
      y: 96 - (value / max) * 88,
    };
  });
}

function gridStyle(count) {
  return {
    gridTemplateColumns: `repeat(${Math.max(1, count)}, minmax(0, 1fr))`,
  };
}

function formatPlain(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

export { TrendAreaChart, VerticalBars };
