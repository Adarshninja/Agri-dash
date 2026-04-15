import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content-layout">
        <Header />
        <main className="page-content animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
