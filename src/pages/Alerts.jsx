import React, { useMemo, useState } from 'react';
import { 
  AlertTriangle, AlertCircle, Info, Bell, BellOff, 
  Droplets, Thermometer, Wind, Leaf, Shield, Activity,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { 
  checkThresholds, groupAlertsByDate, formatTime, 
  computeHealthScore, SENSOR_CONFIG 
} from '../utils/plantHealth';
import './Alerts.css';

const SEVERITY_CONFIG = {
  critical: { icon: AlertCircle, color: '#D32F2F', bg: '#D32F2F12', label: 'Critical' },
  warning: { icon: AlertTriangle, color: '#E2AD60', bg: '#E2AD6012', label: 'Warning' },
  info: { icon: Info, color: '#4CAF50', bg: '#4CAF5012', label: 'Info' },
};

const SENSOR_ICONS = {
  moisture: Droplets,
  temperature: Thermometer,
  humidity: Wind,
  gas: Leaf,
};

// ── Active Alert Banner ──
const ActiveAlertBanner = ({ alerts }) => {
  if (alerts.length === 0) {
    return (
      <div className="alert-banner all-clear">
        <Shield size={24} />
        <div className="banner-text">
          <h3>All Clear</h3>
          <p>All sensors are within normal operating range</p>
        </div>
      </div>
    );
  }

  const criticals = alerts.filter(a => a.severity === 'critical');
  const warnings = alerts.filter(a => a.severity === 'warning');

  return (
    <div className={`alert-banner ${criticals.length > 0 ? 'has-critical' : 'has-warning'}`}>
      <AlertCircle size={24} />
      <div className="banner-text">
        <h3>{criticals.length > 0 ? 'Action Required' : 'Attention Needed'}</h3>
        <p>
          {criticals.length > 0 && `${criticals.length} critical`}
          {criticals.length > 0 && warnings.length > 0 && ' · '}
          {warnings.length > 0 && `${warnings.length} warning`}
          {' — active right now'}
        </p>
      </div>
    </div>
  );
};

// ── Single Alert Card ──
const AlertCard = ({ alert }) => {
  const severity = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
  const SevIcon = severity.icon;
  const SensorIcon = SENSOR_ICONS[alert.sensor] || Activity;

  return (
    <div className="alert-card hover-lift" style={{ '--alert-color': severity.color }}>
      <div className="alert-icon-wrapper" style={{ background: severity.bg }}>
        <SevIcon size={18} style={{ color: severity.color }} />
      </div>
      <div className="alert-content">
        <div className="alert-top-row">
          <span className="alert-sensor">
            <SensorIcon size={14} />
            {alert.label}
          </span>
          <span className={`alert-severity-badge severity-${alert.severity}`}>
            {severity.label}
          </span>
        </div>
        <p className="alert-message">{alert.message}</p>
        <span className="alert-time">{formatTime(alert.timestamp, true)}</span>
      </div>
      <div className="alert-value-display">
        <span className="alert-value">{typeof alert.value === 'number' ? alert.value.toFixed(1) : alert.value}</span>
        <span className="alert-unit">{alert.unit}</span>
      </div>
    </div>
  );
};

// ── Alert Group ──
const AlertGroup = ({ title, alerts, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (alerts.length === 0) return null;

  return (
    <div className="alert-group">
      <button className="group-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="group-title">{title}</span>
        <span className="group-count">{alerts.length}</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && (
        <div className="group-body">
          {alerts.map((alert, i) => (
            <AlertCard key={`${alert.sensor}-${alert.timestamp}-${i}`} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
};

const Alerts = () => {
  const { sensorData, alerts: allAlerts } = useFirebase();

  // Current live threshold breaches
  const liveAlerts = useMemo(() => checkThresholds(sensorData), [sensorData]);

  // Group historical alerts by date
  const grouped = useMemo(() => groupAlertsByDate(allAlerts), [allAlerts]);

  // Stats
  const health = useMemo(() => computeHealthScore(sensorData), [sensorData]);
  const todayCount = grouped.today.length;
  const criticalCount = allAlerts.filter(a => a.severity === 'critical').length;

  // Most triggered sensor
  const mostTriggered = useMemo(() => {
    const counts = {};
    for (const a of allAlerts) {
      counts[a.sensor] = (counts[a.sensor] || 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? SENSOR_CONFIG[top[0]]?.label || top[0] : 'None';
  }, [allAlerts]);

  return (
    <div className="alerts-container animate-fade-in">
      {/* Header */}
      <div className="alerts-header">
        <div>
          <h3>System Monitoring</h3>
          <h1>Alerts & Logs</h1>
        </div>
      </div>

      {/* Active Alerts Banner */}
      <ActiveAlertBanner alerts={liveAlerts} />

      {/* Stat Cards */}
      <div className="alert-stats">
        <div className="alert-stat-card glass-panel">
          <div className="alert-stat-icon"><Bell size={20} /></div>
          <div className="alert-stat-info">
            <span className="alert-stat-value">{todayCount}</span>
            <span className="alert-stat-label">Alerts Today</span>
          </div>
        </div>
        <div className="alert-stat-card glass-panel">
          <div className="alert-stat-icon critical"><AlertCircle size={20} /></div>
          <div className="alert-stat-info">
            <span className="alert-stat-value">{criticalCount}</span>
            <span className="alert-stat-label">Critical Events</span>
          </div>
        </div>
        <div className="alert-stat-card glass-panel">
          <div className="alert-stat-icon warning"><Activity size={20} /></div>
          <div className="alert-stat-info">
            <span className="alert-stat-value">{mostTriggered}</span>
            <span className="alert-stat-label">Most Triggered</span>
          </div>
        </div>
        <div className="alert-stat-card glass-panel">
          <div className="alert-stat-icon" style={{ color: health.color }}>
            <Shield size={20} />
          </div>
          <div className="alert-stat-info">
            <span className="alert-stat-value">{health.emoji} {health.score}</span>
            <span className="alert-stat-label">Health Score</span>
          </div>
        </div>
      </div>

      {/* Alert Feed */}
      <div className="alert-feed glass-panel">
        <div className="feed-header">
          <h4><Bell size={18} /> Alert Feed</h4>
          <span className="feed-total">{allAlerts.length} total events</span>
        </div>

        {allAlerts.length === 0 ? (
          <div className="empty-state">
            <BellOff size={48} />
            <h3>No Alerts Yet</h3>
            <p>Alerts will appear here when sensor readings go outside optimal ranges. Keep your plant healthy!</p>
          </div>
        ) : (
          <div className="feed-body">
            {/* Live alerts always on top */}
            {liveAlerts.length > 0 && (
              <div className="alert-group">
                <div className="group-header live-header">
                  <span className="live-dot" />
                  <span className="group-title">Active Now</span>
                  <span className="group-count">{liveAlerts.length}</span>
                </div>
                <div className="group-body">
                  {liveAlerts.map((alert, i) => (
                    <AlertCard key={`live-${alert.sensor}-${i}`} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            <AlertGroup title="Today" alerts={grouped.today} defaultOpen={true} />
            <AlertGroup title="Yesterday" alerts={grouped.yesterday} defaultOpen={false} />
            <AlertGroup title="Older" alerts={grouped.older} defaultOpen={false} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
