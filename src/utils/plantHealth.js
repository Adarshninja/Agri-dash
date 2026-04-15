// ===== Smart Plant Guard — Health Scoring & Threshold Engine =====

/**
 * Optimal ranges for each sensor.
 * Values within these ranges score 100%.
 */
export const SENSOR_CONFIG = {
  moisture: {
    label: 'Soil Moisture',
    unit: '%',
    optimal: { min: 30, max: 70 },
    warning: { min: 20, max: 85 },
    critical: { min: 10, max: 95 },
    weight: 0.40,
    icon: 'droplets',
  },
  temperature: {
    label: 'Temperature',
    unit: '°C',
    optimal: { min: 18, max: 35 },
    warning: { min: 12, max: 40 },
    critical: { min: 5, max: 45 },
    weight: 0.25,
    icon: 'thermometer',
  },
  humidity: {
    label: 'Humidity',
    unit: '%',
    optimal: { min: 40, max: 80 },
    warning: { min: 25, max: 90 },
    critical: { min: 15, max: 95 },
    weight: 0.20,
    icon: 'wind',
  },
  pressure: {
    label: 'Air Pressure',
    unit: 'hPa',
    optimal: { min: 980, max: 1040 },
    warning: { min: 950, max: 1060 },
    critical: { min: 920, max: 1080 },
    weight: 0.0,
    icon: 'gauge',
  },
  gas: {
    label: 'Air Quality',
    unit: 'kΩ',
    optimal: { min: 0, max: 50 },
    warning: { min: 0, max: 100 },
    critical: { min: 0, max: 150 },
    weight: 0.15,
    icon: 'leaf',
  },
};

/**
 * Compute a 0–100 score for a single sensor based on how close it is
 * to the optimal range. Returns 100 if within optimal, degrades linearly
 * through warning and critical zones.
 */
export function normalizeSensorValue(key, value) {
  const cfg = SENSOR_CONFIG[key];
  if (!cfg) return 50;

  const { optimal, warning, critical } = cfg;

  // Within optimal range → 100
  if (value >= optimal.min && value <= optimal.max) return 100;

  // Below optimal
  if (value < optimal.min) {
    if (value >= warning.min) {
      // Warning zone: score 50–99
      const range = optimal.min - warning.min;
      return range > 0 ? 50 + ((value - warning.min) / range) * 50 : 50;
    }
    if (value >= critical.min) {
      // Critical zone: score 10–49
      const range = warning.min - critical.min;
      return range > 0 ? 10 + ((value - critical.min) / range) * 40 : 10;
    }
    return 0;
  }

  // Above optimal
  if (value <= warning.max) {
    const range = warning.max - optimal.max;
    return range > 0 ? 50 + ((warning.max - value) / range) * 50 : 50;
  }
  if (value <= critical.max) {
    const range = critical.max - warning.max;
    return range > 0 ? 10 + ((critical.max - value) / range) * 40 : 10;
  }
  return 0;
}

/**
 * Compute the overall plant health score (0–100) with weighted breakdown.
 */
export function computeHealthScore(sensorData) {
  const breakdown = {};
  let totalScore = 0;

  for (const [key, cfg] of Object.entries(SENSOR_CONFIG)) {
    const value = sensorData[key];
    if (value === undefined || value === null) continue;
    const score = normalizeSensorValue(key, value);
    breakdown[key] = { score, value, weight: cfg.weight, label: cfg.label };
    totalScore += score * cfg.weight;
  }

  const score = Math.round(totalScore);

  let label, emoji, color;
  if (score >= 80) {
    label = 'Thriving'; emoji = '🌿'; color = '#4CAF50';
  } else if (score >= 60) {
    label = 'Healthy'; emoji = '🌱'; color = '#845F40';
  } else if (score >= 40) {
    label = 'Needs Attention'; emoji = '⚠️'; color = '#E2AD60';
  } else {
    label = 'Critical'; emoji = '🚨'; color = '#D32F2F';
  }

  return { score, label, emoji, color, breakdown };
}

/**
 * Check current sensor data against thresholds and return active alerts.
 */
export function checkThresholds(sensorData, timestamp = null) {
  const alerts = [];
  const ts = timestamp || new Date().toISOString();

  for (const [key, cfg] of Object.entries(SENSOR_CONFIG)) {
    const value = sensorData[key];
    if (value === undefined || value === null) continue;

    const { optimal, warning, critical } = cfg;

    // Critical low
    if (value < critical.min) {
      alerts.push({
        sensor: key, label: cfg.label, value, unit: cfg.unit,
        severity: 'critical', timestamp: ts,
        message: `${cfg.label} critically low at ${value}${cfg.unit}`,
      });
    }
    // Warning low
    else if (value < warning.min) {
      alerts.push({
        sensor: key, label: cfg.label, value, unit: cfg.unit,
        severity: 'critical', timestamp: ts,
        message: `${cfg.label} dangerously low at ${value}${cfg.unit}`,
      });
    }
    // Suboptimal low
    else if (value < optimal.min) {
      alerts.push({
        sensor: key, label: cfg.label, value, unit: cfg.unit,
        severity: 'warning', timestamp: ts,
        message: `${cfg.label} below optimal at ${value}${cfg.unit}`,
      });
    }

    // Critical high
    if (value > critical.max) {
      alerts.push({
        sensor: key, label: cfg.label, value, unit: cfg.unit,
        severity: 'critical', timestamp: ts,
        message: `${cfg.label} critically high at ${value}${cfg.unit}`,
      });
    }
    // Warning high
    else if (value > warning.max) {
      alerts.push({
        sensor: key, label: cfg.label, value, unit: cfg.unit,
        severity: 'critical', timestamp: ts,
        message: `${cfg.label} dangerously high at ${value}${cfg.unit}`,
      });
    }
    // Suboptimal high
    else if (value > optimal.max) {
      alerts.push({
        sensor: key, label: cfg.label, value, unit: cfg.unit,
        severity: 'warning', timestamp: ts,
        message: `${cfg.label} above optimal at ${value}${cfg.unit}`,
      });
    }
  }

  return alerts;
}

/**
 * Compute min/max/avg statistics from a history array for a given sensor key.
 */
export function computeStats(history, key) {
  if (!history || history.length === 0) return { min: 0, max: 0, avg: 0, current: 0 };

  const values = history.map(h => h[key]).filter(v => v !== undefined && v !== null);
  if (values.length === 0) return { min: 0, max: 0, avg: 0, current: 0 };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const current = values[values.length - 1];

  return { min: +min.toFixed(1), max: +max.toFixed(1), avg: +avg.toFixed(1), current: +current.toFixed(1) };
}

/**
 * Get a trend indicator comparing current value vs average of last N readings.
 * Returns { direction: 'up'|'down'|'stable', delta }
 */
export function getTrend(history, key, lookback = 6) {
  if (!history || history.length < 2) return { direction: 'stable', delta: 0 };

  const recent = history.slice(-lookback);
  const avg = recent.reduce((s, h) => s + (h[key] || 0), 0) / recent.length;
  const current = history[history.length - 1]?.[key] || 0;
  const delta = +(current - avg).toFixed(1);

  if (Math.abs(delta) < 0.5) return { direction: 'stable', delta: 0 };
  return { direction: delta > 0 ? 'up' : 'down', delta };
}

/**
 * Format an ISO timestamp for display (e.g., "3:45 PM" or "Apr 15, 3:45 PM").
 */
export function formatTime(isoString, includeDate = false) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;

  const timeOpts = { hour: 'numeric', minute: '2-digit', hour12: true };
  if (includeDate) {
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', ...timeOpts });
  }
  return d.toLocaleTimeString('en-IN', timeOpts);
}

/**
 * Group alerts by date category: "Today", "Yesterday", "Older"
 */
export function groupAlertsByDate(alerts) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups = { today: [], yesterday: [], older: [] };

  for (const alert of alerts) {
    const alertDate = new Date(alert.timestamp);
    const alertDay = new Date(alertDate.getFullYear(), alertDate.getMonth(), alertDate.getDate());

    if (alertDay.getTime() === today.getTime()) {
      groups.today.push(alert);
    } else if (alertDay.getTime() === yesterday.getTime()) {
      groups.yesterday.push(alert);
    } else {
      groups.older.push(alert);
    }
  }

  return groups;
}
