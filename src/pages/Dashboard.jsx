import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line
} from 'recharts';
import { Leaf, Droplets, Thermometer, Wind, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { computeHealthScore, getTrend, SENSOR_CONFIG, normalizeSensorValue, formatTime } from '../utils/plantHealth';
import './Dashboard.css';

// ── Trend icon helper ──
const TrendIcon = ({ direction, delta }) => {
  if (direction === 'up') return <span className="trend trend-up"><TrendingUp size={12} /> +{Math.abs(delta)}</span>;
  if (direction === 'down') return <span className="trend trend-down"><TrendingDown size={12} /> -{Math.abs(delta)}</span>;
  return <span className="trend trend-stable"><Minus size={12} /> 0</span>;
};

// ── Metric Card ──
const MetricCard = ({ title, value, subtitle, icon: Icon, colorClass, trend }) => (
  <div className={`metric-card ${colorClass}`}>
    <div className="card-header">
      <span className="card-title">{title}</span>
      <Icon size={16} className="card-icon" />
    </div>
    <div className="card-body">
      <h3>{value}</h3>
      <div className="card-footer">
        <span className="card-subtitle">{subtitle}</span>
        {trend && <TrendIcon direction={trend.direction} delta={trend.delta} />}
      </div>
    </div>
  </div>
);

// ── Health Ring SVG ──
const HealthRing = ({ score, color, size = 120 }) => {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg className="health-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke="rgba(0,0,0,0.06)" strokeWidth="8" fill="none"
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth="8" fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="health-ring-progress"
      />
      <text x="50%" y="50%" textAnchor="middle" dy="-4" className="health-ring-score" fill={color}>
        {score}
      </text>
      <text x="50%" y="50%" textAnchor="middle" dy="14" className="health-ring-label" fill="var(--text-secondary)">
        / 100
      </text>
    </svg>
  );
};

// ── Custom Tooltip ──
const CustomTooltip = ({ active, payload, label, suffix }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="recharts-custom-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="tooltip-value" style={{ color: p.stroke || p.fill }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{suffix || ''}
        </p>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const { sensorData, sensorHistory } = useFirebase();

  // ── Health Score ──
  const health = useMemo(() => computeHealthScore(sensorData), [sensorData]);

  // ── Trends (compare current vs last 6 readings) ──
  const moistureTrend = useMemo(() => getTrend(sensorHistory, 'moisture'), [sensorHistory]);
  const tempTrend = useMemo(() => getTrend(sensorHistory, 'temperature'), [sensorHistory]);
  const humidityTrend = useMemo(() => getTrend(sensorHistory, 'humidity'), [sensorHistory]);
  const gasTrend = useMemo(() => getTrend(sensorHistory, 'gas'), [sensorHistory]);

  // ── Moisture history (last 24h) for area chart ──
  const moistureChartData = useMemo(() => {
    const last24h = sensorHistory.slice(-288);
    return last24h.map(e => ({
      time: formatTime(e.timestamp),
      moisture: +(e.moisture || 0).toFixed(1),
    }));
  }, [sensorHistory]);

  // ── Temp + Humidity overlay (last 24h) for the big chart ──
  const overlayChartData = useMemo(() => {
    const last24h = sensorHistory.slice(-288);
    return last24h.map(e => ({
      time: formatTime(e.timestamp),
      temperature: +(e.temperature || 0).toFixed(1),
      humidity: +(e.humidity || 0).toFixed(1),
    }));
  }, [sensorHistory]);

  // ── Health breakdown for pie chart ──
  const pieData = useMemo(() => {
    return Object.entries(health.breakdown).map(([key, b]) => ({
      name: b.label,
      value: Math.round(b.score * b.weight),
    }));
  }, [health]);
  const pieColors = ['#845F40', '#C09A72', '#E2AD60', '#4CAF50'];

  // ── Sensor snapshot bar chart (normalized to 0–100) ──
  const barData = useMemo(() => {
    return [
      { name: 'Moisture', val: normalizeSensorValue('moisture', sensorData.moisture), raw: `${sensorData.moisture}%` },
      { name: 'Temp', val: normalizeSensorValue('temperature', sensorData.temperature), raw: `${sensorData.temperature?.toFixed?.(1) || 0}°C` },
      { name: 'Humidity', val: normalizeSensorValue('humidity', sensorData.humidity), raw: `${sensorData.humidity?.toFixed?.(1) || 0}%` },
      { name: 'Air', val: normalizeSensorValue('gas', sensorData.gas), raw: `${sensorData.gas?.toFixed?.(1) || 0} kΩ` },
    ];
  }, [sensorData]);

  const barColor = (val) => {
    if (val >= 80) return '#4CAF50';
    if (val >= 50) return '#E2AD60';
    return '#D32F2F';
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header">
        <div className="title-section">
          <h3>SmartGuard System</h3>
          <div className="health-header">
            <HealthRing score={health.score} color={health.color} />
            <div className="health-info">
              <h1>{health.emoji} {health.label}</h1>
              <p className="health-description">
                {health.score >= 80 && "All sensors within optimal range. Your plant is doing great!"}
                {health.score >= 60 && health.score < 80 && "Most readings are healthy. Minor adjustments may help."}
                {health.score >= 40 && health.score < 60 && "Some sensors outside optimal range. Check conditions."}
                {health.score < 40 && "Multiple sensors in critical range. Immediate action needed!"}
              </p>
              <span className="status-badge" style={{ borderColor: health.color + '33' }}>
                {sensorData.pump ? "💧 Watering Active" : "✅ No Action Needed"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="left-column">
          <div className="metrics-grid">
            <MetricCard 
              title="Soil Moisture" value={`${sensorData.moisture}%`} subtitle="Live" 
              icon={Droplets} colorClass="bg-brown-dark" trend={moistureTrend}
            />
            <MetricCard 
              title="Temperature" value={`${(sensorData.temperature || 0).toFixed(1)}°C`} subtitle="Live" 
              icon={Thermometer} colorClass="bg-brown-light" trend={tempTrend}
            />
            <MetricCard 
              title="Humidity" value={`${(sensorData.humidity || 0).toFixed(1)}%`} subtitle="Live" 
              icon={Wind} colorClass="bg-white" trend={humidityTrend}
            />
            <MetricCard 
              title="Air Quality" value={`${(sensorData.gas || 0).toFixed(1)} kΩ`} 
              subtitle={`${(sensorData.pressure || 0).toFixed(0)} hPa`}
              icon={Leaf} colorClass="bg-mustard" trend={gasTrend}
            />
          </div>

          <div className="chart-card glass-panel small-chart">
            <div className="chart-header">
              <h4>Soil Moisture — Last 24h</h4>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={moistureChartData}>
                  <defs>
                    <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#845F40" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#845F40" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 10 }} interval="preserveStartEnd" />
                  <Tooltip content={<CustomTooltip suffix="%" />} />
                  <Area type="monotone" dataKey="moisture" stroke="#845F40" strokeWidth={2} fillOpacity={1} fill="url(#colorMoisture)" name="Moisture" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="right-column">
          <div className="top-charts">
            <div className="chart-card glass-panel pie-chart-container">
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-label">Health Breakdown</div>
            </div>

            <div className="chart-card glass-panel bar-chart-container">
              <div className="chart-header">
                <h4>Sensor Optimality</h4>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barSize={14} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 11 }} width={60} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="recharts-custom-tooltip">
                        <p className="tooltip-label">{d.name}</p>
                        <p className="tooltip-value">Actual: {d.raw}</p>
                        <p className="tooltip-value">Optimality: {d.val}%</p>
                      </div>
                    );
                  }} />
                  <Bar dataKey="val" radius={[0, 10, 10, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={barColor(entry.val)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card glass-panel main-chart">
            <div className="chart-header">
              <h4>Temperature & Humidity — Last 24h</h4>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overlayChartData}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C09A72" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#C09A72" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHumidity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 11 }} interval="preserveStartEnd" dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={30} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#8C7B6B' }} />
                  <Area type="monotone" dataKey="temperature" stroke="#C09A72" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTemp)" name="Temperature (°C)" />
                  <Area type="monotone" dataKey="humidity" stroke="#4CAF50" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHumidity)" name="Humidity (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
