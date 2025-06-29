import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Play, Upload, Settings, FileText, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/editor', icon: <Play size={20} />, label: 'Editor' },
    { to: '/uploads', icon: <Upload size={20} />, label: 'Uploads' },
    { to: '/analytics', icon: <TrendingUp size={20} />, label: 'Analytics' },
    { to: '/prophecy', icon: <Sparkles size={20} />, label: 'Prophecy' },
    { to: '/transcripts', icon: <FileText size={20} />, label: 'Transcripts' },
    { to: '/history', icon: <Clock size={20} />, label: 'History' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];
  
  return (
    <aside 
      className={cn(
        'fixed left-0 top-[var(--nav-height)] h-[calc(100vh-var(--nav-height))] z-30',
        'transition-all duration-300 overflow-y-auto',
        'bg-background/40 backdrop-blur-md border-r border-primary-500/20',
        isOpen ? 'w-[var(--sidebar-width)] translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-[var(--sidebar-width)]'
      )}
    >
      {/* Liquid morphism effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[100px] bg-primary-500/5 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-500/5 rounded-full blur-3xl opacity-30"></div>
      </div>
      
      <nav className="p-4 space-y-1 relative z-10">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-md transition-all',
              'text-foreground-muted hover:text-foreground',
              isActive 
                ? 'bg-gradient-to-r from-primary-500/20 to-primary-500/10 text-primary-400 font-medium shadow-sm' 
                : 'hover:bg-white/5'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <div className="p-4 bg-gradient-to-br from-primary-900/30 to-background-lighter/50 backdrop-blur-sm rounded-lg border border-primary-500/20 shadow-lg shadow-primary-500/5">
          <h4 className="font-medium text-sm mb-2 title-font">Pro Features</h4>
          <p className="text-xs text-foreground-muted">Upgrade to access advanced AI tools, higher quality exports, and more.</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;