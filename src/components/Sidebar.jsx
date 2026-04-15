import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, SlidersHorizontal, LineChart, BellRing, Sprout } from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import './Sidebar.css';

const Sidebar = () => {
  const { status } = useFirebase();

  return (
    <aside className="sidebar glass-panel">
      <div className="logo-container">
        <div className="logo-icon-wrapper">
          <Sprout className="logo-icon" size={28} color="#FFFFFF" />
        </div>
        <h2>SmartGuard</h2>
      </div>
      
      <nav className="nav-menu">
        <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-item active hover-lift" : "nav-item hover-lift"}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/control" className={({isActive}) => isActive ? "nav-item active hover-lift" : "nav-item hover-lift"}>
          <SlidersHorizontal size={20} />
          <span>Control</span>
        </NavLink>
        <NavLink to="/analytics" className={({isActive}) => isActive ? "nav-item active hover-lift" : "nav-item hover-lift"}>
          <LineChart size={20} />
          <span>Analytics</span>
        </NavLink>
        <NavLink to="/alerts" className={({isActive}) => isActive ? "nav-item active hover-lift" : "nav-item hover-lift"}>
          <BellRing size={20} />
          <span>Alerts</span>
        </NavLink>
      </nav>
      
      <div className="sidebar-footer">
        <div className="system-status">
          <div className={`status-dot ${status === 'online' ? 'online' : status === 'error' ? 'error' : 'connecting'}`} style={{ backgroundColor: status === 'online' ? '#22c55e' : status === 'error' ? '#ef4444' : '#eab308', boxShadow: `0 0 10px ${status === 'online' ? 'rgba(34, 197, 94, 0.5)' : status === 'error' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(234, 179, 8, 0.5)'}` }}></div>
          <span>{status === 'online' ? 'System Online' : status === 'error' ? 'System Error' : 'Connecting...'}</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
