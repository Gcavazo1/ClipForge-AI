import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { ToastViewport } from '../ui/toast';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  
  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);
  
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };
  
  const showSidebar = location.pathname !== '/';
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      {showSidebar && <Sidebar isOpen={isSidebarOpen} />}
      
      <main 
        className={`content-container ${showSidebar ? 'with-sidebar' : ''}`}
        onClick={() => isSidebarOpen && setIsSidebarOpen(false)}
      >
        <Outlet />
      </main>
      
      <ToastViewport />
    </div>
  );
};

export default Layout;