import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ref, onValue, set, query, orderByKey, limitToLast } from 'firebase/database';
import { db, authReady } from '../firebase';
import { checkThresholds } from '../utils/plantHealth';

// Must match DEVICE_ID in the ESP sender code
const DEVICE_ID = 'plant_guardian_01';

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
  const [authLoaded, setAuthLoaded] = useState(false);

  // ── Offline timeout (ms) — if no new data for 7 minutes, mark offline ──
  // ESP sends data every 5 min, so 7 min gives buffer for network delays
  const OFFLINE_TIMEOUT = 7 * 60 * 1000;

  // ── Wait for anonymous auth before subscribing to database ──
  useEffect(() => {
    authReady.then(() => setAuthLoaded(true)).catch(() => setStatus('error'));
  }, []);

  // ── Live sensor data from /devices/{DEVICE_ID}/plant ──
  useEffect(() => {
    if (!authLoaded) return;

    const plantRef = ref(db, `devices/${DEVICE_ID}/plant`);
    const controlRef = ref(db, `devices/${DEVICE_ID}/control`);
    let isFirstLoad = true;

    const unsubscribePlant = onValue(plantRef, (snapshot) => {
      if (snapshot.exists()) {
        setSensorData(prev => {
          const newData = snapshot.val();
          const hasChanged = JSON.stringify(prev) !== JSON.stringify(newData);
          if (hasChanged && !isFirstLoad) {
            // Data changed AFTER first load → ESP just sent fresh data
            setLastUpdate(Date.now());
            setStatus('online');
          }
          isFirstLoad = false;
          return newData;
        });
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
  }, [authLoaded]);

  // ── Heartbeat: check if ESP is still sending data ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdate && Date.now() - lastUpdate > OFFLINE_TIMEOUT) {
        setStatus('offline');
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [lastUpdate]);

  // ── Historical data from /devices/{DEVICE_ID}/sensor_log ──
  // Pull up to 2016 entries (~7 days at 5-min intervals)
  useEffect(() => {
    if (!authLoaded) return;

    let initialCheckDone = false;

    const logQuery = query(
      ref(db, `devices/${DEVICE_ID}/sensor_log`),
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

        // On first load, check the latest entry's timestamp to determine initial status
        if (!initialCheckDone && entries.length > 0) {
          initialCheckDone = true;
          const lastEntry = entries[entries.length - 1];
          const lastTime = new Date(lastEntry.timestamp).getTime();
          const age = Date.now() - lastTime;

          if (age <= OFFLINE_TIMEOUT) {
            setLastUpdate(lastTime);
            setStatus('online');
          } else {
            setLastUpdate(lastTime);
            setStatus('offline');
          }
        }
      }
    }, (error) => {
      console.error('sensor_log error:', error);
    });

    return () => unsubscribeLog();
  }, [authLoaded]);

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
      await set(ref(db, `devices/${DEVICE_ID}/control`), { ...controlData, ...updates });
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
