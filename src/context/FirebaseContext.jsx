import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ref, onValue, set, query, orderByKey, limitToLast } from 'firebase/database';
import { db } from '../firebase';
import { checkThresholds } from '../utils/plantHealth';

const FirebaseContext = createContext();

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider = ({ children }) => {
  const [sensorData, setSensorData] = useState({
    gas: 0,
    humidity: 0,
    moisture: 0,
    pressure: 0,
    temperature: 0,
    pump: false
  });
  
  const [controlData, setControlData] = useState({
    auto: false,
    pump: false,
    threshold: 30,
  });

  const [sensorHistory, setSensorHistory] = useState([]);
  const [status, setStatus] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(null);

  // ── Offline timeout (ms) — if no new data for 7 minutes, mark offline ──
  // ESP sends data every 5 min, so 7 min gives buffer for network delays
  const OFFLINE_TIMEOUT = 7 * 60 * 1000;

  // ── Live sensor data from /plant ──
  useEffect(() => {
    const plantRef = ref(db, 'plant');
    const controlRef = ref(db, 'control');

    const unsubscribePlant = onValue(plantRef, (snapshot) => {
      if (snapshot.exists()) {
        setSensorData(prev => {
          const newData = snapshot.val();
          // Check if data actually changed (ESP sent new reading)
          const hasChanged = JSON.stringify(prev) !== JSON.stringify(newData);
          if (hasChanged) {
            setLastUpdate(Date.now());
            setStatus('online');
          }
          return newData;
        });
        // First load — set online and timestamp
        if (!lastUpdate) {
          setLastUpdate(Date.now());
          setStatus('online');
        }
      }
    }, (error) => {
      console.error(error);
      setStatus('error');
    });

    const unsubscribeControl = onValue(controlRef, (snapshot) => {
      if (snapshot.exists()) {
        setControlData(prev => ({ ...prev, ...snapshot.val() }));
      }
    });

    return () => {
      unsubscribePlant();
      unsubscribeControl();
    };
  }, []);

  // ── Heartbeat: check if ESP is still sending data ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdate && Date.now() - lastUpdate > OFFLINE_TIMEOUT) {
        setStatus('offline');
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [lastUpdate]);

  // ── Historical data from /sensor_log ──
  // Pull up to 2016 entries (~7 days at 5-min intervals)
  useEffect(() => {
    const logQuery = query(
      ref(db, 'sensor_log'),
      orderByKey(),
      limitToLast(2016)
    );

    const unsubscribeLog = onValue(logQuery, (snapshot) => {
      if (snapshot.exists()) {
        const raw = snapshot.val();
        const entries = Object.values(raw)
          .filter(e => e && e.timestamp)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setSensorHistory(entries);
      }
    }, (error) => {
      console.error('sensor_log error:', error);
    });

    return () => unsubscribeLog();
  }, []);

  // ── Generate alerts from historical data ──
  const alerts = useMemo(() => {
    const allAlerts = [];

    // Check current live data
    const liveAlerts = checkThresholds(sensorData);
    allAlerts.push(...liveAlerts);

    // Check historical data (last 288 entries = ~24h)
    const recentHistory = sensorHistory.slice(-288);
    for (const entry of recentHistory) {
      const entryAlerts = checkThresholds(entry, entry.timestamp);
      allAlerts.push(...entryAlerts);
    }

    // Deduplicate: keep only the latest alert per sensor+severity combo
    // But also keep historical ones for the alerts feed
    const sorted = allAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return sorted;
  }, [sensorData, sensorHistory]);

  const updateControl = async (updates) => {
    try {
      await set(ref(db, 'control'), { ...controlData, ...updates });
    } catch (e) {
      console.error("Failed to update control node:", e);
    }
  };

  return (
    <FirebaseContext.Provider value={{ 
      sensorData, 
      controlData, 
      sensorHistory, 
      alerts, 
      updateControl, 
      status 
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};
