import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell, LineChart, Line, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart
} from 'recharts';
import { 
  Droplets, Thermometer, Wind, Leaf, Gauge,
  Table, Activity
} from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { 
  computeStats, SENSOR_CONFIG, normalizeSensorValue, formatTime, computeHealthScore
} from '../utils/plantHealth';
import './Analytics.css';

const TIME_RANGES = [
  { label: '6h', hours: 6, entries: 72 },
  { label: '24h', hours: 24, entries: 288 },
  { label: '3d', hours: 72, entries: 864 },
  { label: '7d', hours: 168, entries: 2016 },
];

const SENSOR_COLORS = {
  moisture: '#845F40',
  temperature: '#C09A72',
  humidity: '#4CAF50',
  pressure: '#E2AD60',
  gas: '#9C7A5A',
};

// ── Stat Card with sparkline ──
const StatCard = ({ label, unit, icon: Icon, current, avg, min, max, sparkData, dataKey, color }) => (
  <div className="stat-card glass-panel hover-lift">
    <div className="stat-card-header">
      <div className="stat-icon-wrapper" style={{ background: color + '18' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <span className="stat-label">{label}</span>
    </div>
    <div className="stat-main">
      <h2 className="stat-current">{current}<span className="stat-unit">{unit}</span></h2>
    </div>
    <div className="stat-sparkline">
      <ResponsiveContainer width="100%" height={40}>
        <AreaChart data={sparkData}>
          <defs>
            <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={`url(#spark-${dataKey})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    <div className="stat-row">
      <div className="stat-mini">
        <span className="stat-mini-label">Avg</span>
        <span className="stat-mini-value">{avg}</span>
      </div>
      <div className="stat-mini">
        <span className="stat-mini-label">Min</span>
        <span className="stat-mini-value">{min}</span>
      </div>
      <div className="stat-mini">
        <span className="stat-mini-label">Max</span>
        <span className="stat-mini-value">{max}</span>
      </div>
    </div>
  </div>
);

// ── Custom Tooltip ──
const MultiTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="analytics-tooltip">
      <p className="tooltip-time">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="tooltip-row">
          <span className="tooltip-dot" style={{ background: p.stroke || p.fill || p.color }} />
          <span className="tooltip-name">{p.name}</span>
          <span className="tooltip-val">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const Analytics = () => {
  const { sensorHistory, sensorData } = useFirebase();
  const [timeRange, setTimeRange] = useState(1); // default 24h
  const [activeLines, setActiveLines] = useState({
    moisture: true, temperature: true, humidity: true, pressure: false, gas: false
  });
  const [showTable, setShowTable] = useState(false);

  // ── Filter data by time range ──
  const filteredData = useMemo(() => {
    const range = TIME_RANGES[timeRange];
    return sensorHistory.slice(-range.entries).map(e => ({
      ...e,
      time: formatTime(e.timestamp, timeRange >= 2),
    }));
  }, [sensorHistory, timeRange]);

  // ── Stats for each sensor ──
  const stats = useMemo(() => ({
    moisture: computeStats(filteredData, 'moisture'),
    temperature: computeStats(filteredData, 'temperature'),
    humidity: computeStats(filteredData, 'humidity'),
    pressure: computeStats(filteredData, 'pressure'),
    gas: computeStats(filteredData, 'gas'),
  }), [filteredData]);

  // ── Radar data (current sensor health) ──
  const radarData = useMemo(() => {
    return Object.entries(SENSOR_CONFIG).map(([key, cfg]) => ({
      sensor: cfg.label.split(' ').pop(), // short name
      value: normalizeSensorValue(key, sensorData[key] || 0),
      fullMark: 100,
    }));
  }, [sensorData]);

  // ── Hourly pattern data (avg per hour) ──
  const hourlyPattern = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      moisture: [], temperature: [], humidity: []
    }));

    for (const entry of filteredData) {
      const d = new Date(entry.timestamp);
      if (isNaN(d.getTime())) continue;
      const h = d.getHours();
      if (entry.moisture != null) buckets[h].moisture.push(entry.moisture);
      if (entry.temperature != null) buckets[h].temperature.push(entry.temperature);
      if (entry.humidity != null) buckets[h].humidity.push(entry.humidity);
    }

    return buckets.map(b => ({
      hour: b.hour,
      moisture: b.moisture.length ? +(b.moisture.reduce((s, v) => s + v, 0) / b.moisture.length).toFixed(1) : 0,
      temperature: b.temperature.length ? +(b.temperature.reduce((s, v) => s + v, 0) / b.temperature.length).toFixed(1) : 0,
      humidity: b.humidity.length ? +(b.humidity.reduce((s, v) => s + v, 0) / b.humidity.length).toFixed(1) : 0,
    }));
  }, [filteredData]);

  // ── Correlation scatter: moisture vs temperature ──
  const correlationData = useMemo(() => {
    return filteredData.map(e => ({
      moisture: e.moisture || 0,
      temperature: e.temperature || 0,
    }));
  }, [filteredData]);

  // ── Health history ──
  const healthHistory = useMemo(() => {
    return filteredData.map(e => ({
      time: e.time,
      score: computeHealthScore(e).score
    }));
  }, [filteredData]);

  const toggleLine = (key) => {
    setActiveLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="analytics-container animate-fade-in">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h3>System Analytics</h3>
          <h1>Sensor Intelligence</h1>
        </div>
        <div className="time-range-selector">
          {TIME_RANGES.map((r, i) => (
            <button
              key={r.label}
              className={`range-pill ${timeRange === i ? 'active' : ''}`}
              onClick={() => setTimeRange(i)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: Stat Cards */}
      <div className="stats-grid">
        <StatCard 
          label="Soil Moisture" unit="%" icon={Droplets}
          current={stats.moisture.current} avg={stats.moisture.avg} 
          min={stats.moisture.min} max={stats.moisture.max}
          sparkData={filteredData} dataKey="moisture" color={SENSOR_COLORS.moisture}
        />
        <StatCard 
          label="Temperature" unit="°C" icon={Thermometer}
          current={stats.temperature.current} avg={stats.temperature.avg} 
          min={stats.temperature.min} max={stats.temperature.max}
          sparkData={filteredData} dataKey="temperature" color={SENSOR_COLORS.temperature}
        />
        <StatCard 
          label="Humidity" unit="%" icon={Wind}
          current={stats.humidity.current} avg={stats.humidity.avg} 
          min={stats.humidity.min} max={stats.humidity.max}
          sparkData={filteredData} dataKey="humidity" color={SENSOR_COLORS.humidity}
        />
        <StatCard 
          label="Air Pressure" unit="hPa" icon={Gauge}
          current={stats.pressure.current} avg={stats.pressure.avg} 
          min={stats.pressure.min} max={stats.pressure.max}
          sparkData={filteredData} dataKey="pressure" color={SENSOR_COLORS.pressure}
        />
        <StatCard 
          label="Gas Resistance" unit="kΩ" icon={Leaf}
          current={stats.gas.current} avg={stats.gas.avg} 
          min={stats.gas.min} max={stats.gas.max}
          sparkData={filteredData} dataKey="gas" color={SENSOR_COLORS.gas}
        />
      </div>

      {/* Section 2: Multi-Sensor Trend Chart */}
      <div className="chart-section glass-panel">
        <div className="chart-section-header">
          <h4><Activity size={18} /> Multi-Sensor Trend</h4>
          <div className="line-toggles">
            {Object.entries(SENSOR_COLORS).map(([key, color]) => (
              <button
                key={key}
                className={`line-toggle ${activeLines[key] ? 'active' : ''}`}
                style={{ '--toggle-color': color }}
                onClick={() => toggleLine(key)}
              >
                <span className="toggle-dot" style={{ background: activeLines[key] ? color : '#ccc' }} />
                {SENSOR_CONFIG[key].label}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-section-body" style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 11 }} />
              <Tooltip content={<MultiTooltip />} />
              {activeLines.moisture && (
                <Area yAxisId="left" type="monotone" dataKey="moisture" stroke={SENSOR_COLORS.moisture} strokeWidth={2} fill={SENSOR_COLORS.moisture} fillOpacity={0.08} name="Moisture (%)" dot={false} />
              )}
              {activeLines.temperature && (
                <Line yAxisId="right" type="monotone" dataKey="temperature" stroke={SENSOR_COLORS.temperature} strokeWidth={2} name="Temperature (°C)" dot={false} />
              )}
              {activeLines.humidity && (
                <Line yAxisId="left" type="monotone" dataKey="humidity" stroke={SENSOR_COLORS.humidity} strokeWidth={2} name="Humidity (%)" dot={false} />
              )}
              {activeLines.pressure && (
                <Line yAxisId="right" type="monotone" dataKey="pressure" stroke={SENSOR_COLORS.pressure} strokeWidth={2} name="Pressure (hPa)" dot={false} />
              )}
              {activeLines.gas && (
                <Line yAxisId="right" type="monotone" dataKey="gas" stroke={SENSOR_COLORS.gas} strokeWidth={2} name="Gas (kΩ)" dot={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 3: Insights Grid */}
      <div className="insights-grid">
        {/* Radar: Sensor Health */}
        <div className="insight-card glass-panel">
          <h4>Sensor Health Radar</h4>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(0,0,0,0.08)" />
                <PolarAngleAxis dataKey="sensor" tick={{ fill: '#8C7B6B', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Health" dataKey="value" stroke="#845F40" fill="#845F40" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plant Health Over Time */}
        <div className="insight-card glass-panel">
          <h4>Plant Health Score Over Time</h4>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthHistory}>
                <defs>
                  <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 10 }} />
                <Tooltip content={<MultiTooltip />} />
                <Area type="monotone" dataKey="score" stroke="#4CAF50" strokeWidth={2} fill="url(#healthGrad)" name="Health Score" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Pattern */}
        <div className="insight-card glass-panel">
          <h4>24h Moisture & Temperature Pattern</h4>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyPattern} barSize={8}>
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 9 }} interval={2} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 10 }} />
                <Tooltip content={<MultiTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="moisture" fill={SENSOR_COLORS.moisture} radius={[4, 4, 0, 0]} name="Moisture (%)" />
                <Bar dataKey="temperature" fill={SENSOR_COLORS.temperature} radius={[4, 4, 0, 0]} name="Temp (°C)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Moisture vs Temperature Correlation */}
        <div className="insight-card glass-panel">
          <h4>Moisture vs Temperature</h4>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6B', fontSize: 10 }} />
                <Tooltip content={<MultiTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Line yAxisId="left" type="monotone" dataKey="moisture" stroke="#845F40" strokeWidth={2} dot={false} name="Moisture (%)" />
                <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#C09A72" strokeWidth={2} dot={false} name="Temp (°C)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section 4: Data Table */}
      <div className="table-section glass-panel">
        <div className="table-header">
          <h4><Table size={18} /> Sensor Log</h4>
          <button className="table-toggle" onClick={() => setShowTable(!showTable)}>
            {showTable ? 'Hide Table' : 'Show Data Table'}
          </button>
        </div>
        {showTable && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Moisture (%)</th>
                  <th>Temp (°C)</th>
                  <th>Humidity (%)</th>
                  <th>Pressure (hPa)</th>
                  <th>Gas (kΩ)</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice().reverse().slice(0, 50).map((entry, i) => {
                  const mScore = normalizeSensorValue('moisture', entry.moisture);
                  const tScore = normalizeSensorValue('temperature', entry.temperature);
                  const hScore = normalizeSensorValue('humidity', entry.humidity);
                  const gScore = normalizeSensorValue('gas', entry.gas);
                  return (
                    <tr key={i}>
                      <td className="td-time">{formatTime(entry.timestamp, true)}</td>
                      <td className={`td-cell ${mScore >= 80 ? 'cell-good' : mScore >= 50 ? 'cell-warn' : 'cell-bad'}`}>
                        {entry.moisture?.toFixed?.(1) ?? '—'}
                      </td>
                      <td className={`td-cell ${tScore >= 80 ? 'cell-good' : tScore >= 50 ? 'cell-warn' : 'cell-bad'}`}>
                        {entry.temperature?.toFixed?.(1) ?? '—'}
                      </td>
                      <td className={`td-cell ${hScore >= 80 ? 'cell-good' : hScore >= 50 ? 'cell-warn' : 'cell-bad'}`}>
                        {entry.humidity?.toFixed?.(1) ?? '—'}
                      </td>
                      <td>{entry.pressure?.toFixed?.(1) ?? '—'}</td>
                      <td className={`td-cell ${gScore >= 80 ? 'cell-good' : gScore >= 50 ? 'cell-warn' : 'cell-bad'}`}>
                        {entry.gas?.toFixed?.(1) ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
