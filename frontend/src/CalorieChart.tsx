import React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

// ── TypeScript 介面定義 ────────────────────────────────

export interface ChartDataPoint {
  mealType: string;           // e.g. "早餐"
  cumulativeCalories: number; // cumulative kcal up to this point
}

interface CalorieChartProps {
  data: ChartDataPoint[];
  dailyTarget?: number;      // optional TDEE target line (kcal)
}

// ── 自訂 Tooltip ──────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        borderRadius: '10px',
        padding: '10px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem', marginBottom: '4px' }}>
          🕐 {label}
        </p>
        <p style={{ margin: 0, color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem' }}>
          {Number(payload[0].value).toFixed(0)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>kcal</span>
        </p>
      </div>
    );
  }
  return null;
};

// ── 主元件 ───────────────────────────────────────────

const CalorieChart: React.FC<CalorieChartProps> = ({ data, dailyTarget }) => {
  const isEmpty = data.length === 0;

  // Determine Y-axis max: whichever is bigger — dataset max or daily target
  const dataMax = data.length > 0 ? Math.max(...data.map(d => d.cumulativeCalories)) : 500;
  const yMax = dailyTarget ? Math.max(dataMax, dailyTarget) * 1.1 : dataMax * 1.3;

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {isEmpty && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 2, pointerEvents: 'none',
        }}>
          <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</span>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
            尚無今日飲食紀錄
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={isEmpty ? [{ mealType: '--', cumulativeCalories: 0 }] : data}
          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>

          {/* Gradient fill */}
          <defs>
            <linearGradient id="calorieGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />

          <XAxis
            dataKey="mealType"
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
          />

          <YAxis
            domain={[0, yMax]}
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}`}
            width={48}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(59,130,246,0.3)', strokeWidth: 1 }} />

          {/* Daily target reference line as a second invisible area */}
          {dailyTarget && (
            <Area
              type="monotone"
              dataKey={() => dailyTarget}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              fill="none"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          )}

          {/* Main calorie curve */}
          <Area
            type="monotone"
            dataKey="cumulativeCalories"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill="url(#calorieGrad)"
            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#0f172a' }}
            activeDot={{ r: 6, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
            isAnimationActive={!isEmpty}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 16, height: 3, background: '#3b82f6', borderRadius: 2, display: 'inline-block' }} />
          累積熱量
        </span>
        {dailyTarget && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 16, height: 0, borderTop: '2px dashed #f59e0b', display: 'inline-block' }} />
            每日目標 ({dailyTarget.toFixed(0)} kcal)
          </span>
        )}
      </div>
    </div>
  );
};

export default CalorieChart;
