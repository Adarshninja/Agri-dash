import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ArrowLeft } from 'lucide-react';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="notfound-container animate-fade-in">
      <div className="notfound-icon">
        <Sprout size={48} />
      </div>
      <span className="notfound-code">404</span>
      <h1 className="notfound-title">Page Not Found</h1>
      <p className="notfound-desc">
        The page you're looking for doesn't exist or has been moved. 
        Head back to the dashboard to monitor your plants.
      </p>
      <Link to="/dashboard" className="notfound-btn">
        <ArrowLeft size={18} />
        Back to Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
