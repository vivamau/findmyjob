interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  title: string;
}

export default function PieChart({ data, title }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="glass-card">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {total === 0 ? (
        <p className="text-secondary">No data available.</p>
      ) : (
        <div className="flex items-center gap-8">
          <div className="relative w-48 h-48 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {data.map((item, index) => {
                const startAngle = (data.slice(0, index).reduce((sum, i) => sum + i.value, 0) / total) * 360;
                const endAngle = (data.slice(0, index + 1).reduce((sum, i) => sum + i.value, 0) / total) * 360;
                
                const startRad = (startAngle - 90) * (Math.PI / 180);
                const endRad = (endAngle - 90) * (Math.PI / 180);
                
                const x1 = 50 + 48 * Math.cos(startRad);
                const y1 = 50 + 48 * Math.sin(startRad);
                const x2 = 50 + 48 * Math.cos(endRad);
                const y2 = 50 + 48 * Math.sin(endRad);
                
                const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
                
                const pathData = item.value === total
                  ? 'M 50 2 A 48 48 0 1 1 49.9 2 Z'
                  : `M 50 50 L ${x1} ${y1} A 48 48 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                return (
                  <path
                    key={item.label}
                    d={pathData}
                    fill={item.color}
                    stroke="var(--bg-card)"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-4 bg-[var(--bg-card)] rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold">{formatNumber(total)}</span>
              <span className="text-xs text-secondary ml-1">tokens</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {data.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm">{item.label}</span>
                    <span className="text-sm font-semibold">{formatNumber(item.value)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(item.value / total) * 100}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-secondary">{((item.value / total) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}
