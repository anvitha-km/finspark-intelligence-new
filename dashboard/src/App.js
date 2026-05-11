import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  BarChart2, 
  ShieldCheck, 
  Lightbulb, 
  GitCompare, 
  Server, 
  Key, 
  LogOut, 
  Search, 
  ChevronRight
} from 'lucide-react';
import FinSparkLogo from './components/FinSparkLogo';

import HeatmapView    from './components/HeatmapView';
import FunnelView     from './components/FunnelView';
import LicenseView    from './components/LicenseView';
import GovernanceView from './components/GovernanceView';
import InsightsView   from './components/InsightsView';
import ComparisonView from './components/ComparisonView';
import SystemStatusView from './components/SystemStatusView';
import LoginView      from './components/LoginView';

const ALL_TABS = [
  { name: 'Heatmap', icon: Activity },
  { name: 'Funnel', icon: BarChart2 },
  { name: 'License Usage', icon: Key },
  { name: 'Governance', icon: ShieldCheck, adminOnly: true },
  { name: 'Insights', icon: Lightbulb },
  { name: 'Comparison', icon: GitCompare },
  { name: 'System Status', icon: Server }
];

function getTabsForRole(role) {
  let tabs = ALL_TABS;
  if (role !== 'admin') {
    tabs = tabs.filter(t => !t.adminOnly);
  }
  if (role === 'tenant') {
    tabs = tabs.filter(t => ['Heatmap', 'Funnel', 'Insights'].includes(t.name));
  }
  return tabs;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('Heatmap');
  const [isSidebarOpen] = useState(true);

  if (!user) return <LoginView onLogin={(u) => setUser(u)} />;

  const tabs = getTabsForRole(user.role);
  const handleLogout = () => { setUser(null); setActiveTab('Heatmap'); };

  const roleBadge = {
    admin:  { color: '#8b5cf6', label: 'Enterprise Admin' },
    viewer: { color: '#06b6d4', label: 'Platform Viewer' },
    tenant: { color: '#10b981', label: 'Tenant Manager' },
  }[user.role];

  return (
    <div className="app-container">
      {/* ─── Sidebar ─── */}
      <aside className={`app-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand-block">
          <div className="sidebar-logo-container">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <FinSparkLogo size={42} variant="badge" />
            </motion.div>
            <div className="brand-info">
              <span className="brand-name">FinSpark</span>
              <span className="brand-tagline">Intelligence</span>
            </div>
          </div>
          
          <div style={{ marginTop: 24, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Command search..." 
              className="premium-search" 
              style={{ width: '100%', paddingLeft: 36, height: 40 }}
            />
            <div style={{ position: 'absolute', right: 12, top: 10, display: 'flex', gap: 4 }}>
              <kbd style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: 4, fontSize: 10, color: 'var(--text-muted)' }}>⌘</kbd>
              <kbd style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: 4, fontSize: 10, color: 'var(--text-muted)' }}>K</kbd>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.name;
            return (
              <motion.div
                key={tab.name}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.name)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span>{tab.name}</span>
                {isActive && (
                  <motion.div 
                    layoutId="activeIndicator"
                    className="active-indicator"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                {tab.adminOnly && (
                  <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.5, border: '1px solid currentColor', padding: '1px 4px', borderRadius: 4 }}>PRO</span>
                )}
              </motion.div>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', padding: '20px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#ffffff',
              flexShrink: 0, letterSpacing: '-0.02em',
              boxShadow: '0 0 0 2px rgba(255,255,255,0.1)'
            }}>
              {user.name[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{user.tenant}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="nav-item" 
            style={{ width: '100%', justifyContent: 'center', gap: 8, background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)', marginTop: 4 }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>Workspace</span>
            <ChevronRight size={14} color="#94a3b8" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{activeTab}</span>
          </div>

          <div className="header-search-container">
            {/* Contextual breadcrumb or search could go here */}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#f0fdf4', borderRadius: 20, border: '1px solid #bbf7d0' }}>
              <div className="status-dot" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>System Live</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: roleBadge.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {roleBadge.label}
            </div>
          </div>
        </header>

        <main className="content-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {user.role === 'viewer' && (
                <div style={{ marginBottom: 24, padding: '12px 20px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, color: '#06b6d4', fontSize: 13 }}>
                  <ShieldCheck size={18} />
                  <span>Read-only access — contact an admin to modify settings</span>
                </div>
              )}

              {activeTab === 'Heatmap'       && <HeatmapView user={user} />}
              {activeTab === 'Funnel'        && <FunnelView user={user} />}
              {activeTab === 'License Usage' && <LicenseView />}
              {activeTab === 'Governance'    && <GovernanceView />}
              {activeTab === 'Insights'      && <InsightsView user={user} />}
              {activeTab === 'Comparison'    && <ComparisonView />}
              {activeTab === 'System Status' && <SystemStatusView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
