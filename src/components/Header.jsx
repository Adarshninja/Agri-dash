import React from 'react';
import { User, Search, Settings } from 'lucide-react';
import './Header.css';

const Header = () => {
  return (
    <header className="header glass-panel">
      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input type="text" placeholder="Search parameters or logs..." />
      </div>
      <div className="header-actions">
        <button className="icon-btn hover-lift">
          <Settings size={20} />
        </button>
        <div className="user-profile hover-lift">
          <div className="avatar">
            <User size={18} color="#FFF" />
          </div>
          <div className="user-info">
            <span className="name">Admin User</span>
            <span className="role">Farm Manager</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
