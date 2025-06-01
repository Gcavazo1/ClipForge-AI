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
        'fixed left-0 top-[var(--nav-height)] h-[calc(100vh-var(--nav-height))] bg-background z-30',
        'transition-all duration-300 border-r border-background-lighter overflow-y-auto',
        isOpen ? 'w-[var(--sidebar-width)] translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-[var(--sidebar-width)]'
      )}
    >
      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
              'text-foreground-muted hover:text-foreground hover:bg-background-lighter',
              isActive && 'bg-background-lighter text-primary-400 font-medium'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="p-4 bg-background-lighter rounded-lg">
          <h4 className="font-medium text-sm mb-2">Pro Features</h4>
          <p className="text-xs text-foreground-muted">Upgrade to access advanced AI tools, higher quality exports, and more.</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;