import React, { useMemo } from 'react';
import { Power, Cpu, Droplets, Thermometer, Activity, Gauge } from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { computeHealthScore, formatTime } from '../utils/plantHealth';
import './Control.css';

const Control = () => {
  const { sensorData, controlData, sensorHistory, updateControl } = useFirebase();
  
  const isPumpActive = controlData?.pump || false;
  const isAutoActive = controlData?.auto || false;
  const threshold = controlData?.threshold || 30;

  const health = useMemo(() => computeHealthScore(sensorData), [sensorData]);

  // Last watered: find last time in history where pump was active
  // (fallback to "N/A" if not tracked)
  const lastWatered = useMemo(() => {
    if (isPumpActive) return 'Now';
    // Check if history has pump data
    for (let i = sensorHistory.length - 1; i >= 0; i--) {
      if (sensorHistory[i]?.pump) {
        return formatTime(sensorHistory[i].timestamp, true);
      }
    }
    return 'N/A';
  }, [sensorHistory, isPumpActive]);

  // Pump activity timeline (last 12 entries as visual blocks)
  const pumpTimeline = useMemo(() => {
    const last12 = sensorHistory.slice(-12);
    return last12.map((e, i) => ({
      time: formatTime(e.timestamp),
      active: e.moisture < threshold, // Infer: pump would have been on if moisture was below threshold
    }));
  }, [sensorHistory, threshold]);

  const handlePump = () => {
    updateControl({ pump: !isPumpActive });
  };
  
  const handleAuto = () => {
    updateControl({ auto: !isAutoActive });
  };

  const handleThreshold = (e) => {
    const value = parseInt(e.target.value, 10);
    updateControl({ threshold: value });
  };

  return (
    <div className="control-container animate-fade-in">
      <div className="dashboard-header mb-4">
        <div className="title-section">
          <h3>Irrigation Settings</h3>
          <h1>Control Panel</h1>
        </div>
      </div>

      {/* Live Sensor Summary Strip */}
      <div className="sensor-strip">
        <div className="strip-card">
          <Droplets size={16} />
          <span className="strip-label">Moisture</span>
          <span className="strip-value">{sensorData.moisture}%</span>
        </div>
        <div className="strip-card">
          <Thermometer size={16} />
          <span className="strip-label">Temperature</span>
          <span className="strip-value">{(sensorData.temperature || 0).toFixed(1)}°C</span>
        </div>
        <div className="strip-card">
          <Activity size={16} />
          <span className="strip-label">Health</span>
          <span className="strip-value">{health.emoji} {health.score}</span>
        </div>
        <div className="strip-card">
          <Gauge size={16} />
          <span className="strip-label">Last Watered</span>
          <span className="strip-value">{lastWatered}</span>
        </div>
      </div>

      <div className="control-grid">
        {/* Water Pump Card */}
        <div className="control-card glass-panel flex-center">
          <div className="control-card-header w-100">
            <h4>Water Pump</h4>
            <Power size={18} />
          </div>
          <div className="control-card-body flex-center" style={{flex: 1}}>
            <button 
              className={`big-power-btn ${isPumpActive ? 'active' : ''}`}
              onClick={handlePump}
              disabled={isAutoActive}
            >
              <Power size={48} />
            </button>
            <h3 className="status-text">{isPumpActive ? 'RUNNING' : 'STOPPED'}</h3>
            <p className="status-sub">
              {isAutoActive ? "Disabled (Auto Mode Active)" : "Manual override available"}
            </p>
          </div>
        </div>

        {/* Operation Mode Card */}
        <div className="control-card glass-panel">
          <div className="control-card-header">
            <h4>Operation Mode</h4>
            <Cpu size={18} />
          </div>
          <div className="control-card-body auto-mode-body">
            <div className="toggle-row hover-lift">
              <div className="toggle-info">
                <h3>Auto Watering</h3>
                <p>Pump activates when moisture drops below threshold</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={isAutoActive} onChange={handleAuto} />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Moisture Threshold Slider */}
            <div className={`threshold-section ${isAutoActive ? 'active' : 'disabled'}`}>
              <div className="threshold-header">
                <span className="threshold-label">Moisture Threshold</span>
                <span className="threshold-value">{threshold}%</span>
              </div>
              <input 
                type="range" 
                min="10" max="80" 
                value={threshold} 
                onChange={handleThreshold}
                disabled={!isAutoActive}
                className="threshold-slider"
              />
              <div className="threshold-range">
                <span>10%</span>
                <span>Dry ← → Wet</span>
                <span>80%</span>
              </div>
              <p className="threshold-desc">
                {isAutoActive 
                  ? `Pump will activate when soil moisture drops below ${threshold}%`
                  : "Enable auto mode to configure threshold"
                }
              </p>
            </div>

            {/* Pump Activity Timeline */}
            {pumpTimeline.length > 0 && (
              <div className="pump-timeline">
                <span className="timeline-label">Recent Moisture Activity</span>
                <div className="timeline-blocks">
                  {pumpTimeline.map((block, i) => (
                    <div 
                      key={i}
                      className={`timeline-block ${block.active ? 'watered' : ''}`}
                      title={`${block.time} — ${block.active ? 'Below threshold' : 'OK'}`}
                    />
                  ))}
                </div>
                <div className="timeline-legend">
                  <span><span className="legend-dot watered"></span> Below threshold</span>
                  <span><span className="legend-dot ok"></span> OK</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Control;
