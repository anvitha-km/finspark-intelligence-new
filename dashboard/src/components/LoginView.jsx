import React, { useState } from 'react';
import FinSparkLogo from './FinSparkLogo';

/**
 * LoginView — hardcoded credential login for hackathon demo.
 * Redesigned for professional light theme with clean text visibility.
 */

const USERS = [
  { email: 'admin@finspark.io',    password: 'admin123',    role: 'admin',  name: 'Admin User',        tenant: 'All Tenants' },
  { email: 'viewer@finspark.io',   password: 'viewer123',   role: 'viewer', name: 'Viewer User',       tenant: 'Read Only' },
  { email: 'tenant_a@finspark.io', password: 'tenanta123',  role: 'tenant', name: 'Tenant A Manager',  tenant: 'tenant_a' },
  { email: 'tenant_b@finspark.io', password: 'tenantb123',  role: 'tenant', name: 'Tenant B Manager',  tenant: 'tenant_b' },
  { email: 'tenant_c@finspark.io', password: 'tenantc123',  role: 'tenant', name: 'Tenant C Manager',  tenant: 'tenant_c' },
  { email: 'tenant_d@finspark.io', password: 'tenantd123',  role: 'tenant', name: 'Tenant D Manager',  tenant: 'tenant_d' },
  { email: 'tenant_e@finspark.io', password: 'tenante123',  role: 'tenant', name: 'Tenant E Manager',  tenant: 'tenant_e' },
];

export default function LoginView({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      const user = USERS.find(u => u.email === email && u.password === password);
      if (user) { onLogin(user); }
      else { setError('Invalid email or password. Try a demo credential below.'); setLoading(false); }
    }, 600);
  };

  const fillDemo = (type) => {
    const map = {
      admin:    ['admin@finspark.io', 'admin123'],
      viewer:   ['viewer@finspark.io', 'viewer123'],
      tenant_a: ['tenant_a@finspark.io', 'tenanta123'],
      tenant_b: ['tenant_b@finspark.io', 'tenantb123'],
      tenant_c: ['tenant_c@finspark.io', 'tenantc123'],
      tenant_d: ['tenant_d@finspark.io', 'tenantd123'],
      tenant_e: ['tenant_e@finspark.io', 'tenante123'],
    };
    if (map[type]) { setEmail(map[type][0]); setPassword(map[type][1]); setError(''); }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    background: '#f8fafc', border: '1.5px solid #e2e8f0',
    color: '#0f172a', fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'Inter, sans-serif',
  };

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: '#f1f5f9',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, -apple-system, sans-serif',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Subtle background decoration */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 60% 20%, rgba(59,130,246,0.07), transparent 50%), radial-gradient(circle at 20% 80%, rgba(99,102,241,0.05), transparent 40%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: 900,
        display: 'flex', borderRadius: 20,
        background: '#ffffff',
        boxShadow: '0 8px 40px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        position: 'relative', zIndex: 1,
      }}>

        {/* ─── Left Panel ─── */}
        <div style={{
          flex: '0 0 45%', padding: '56px 48px',
          background: 'linear-gradient(150deg, #1e293b 0%, #0f172a 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
              <FinSparkLogo size={44} variant="badge" />
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>FinSpark</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Intelligence</div>
              </div>
            </div>

            <div style={{ fontSize: 26, fontWeight: 700, color: '#ffffff', lineHeight: 1.3, letterSpacing: '-0.03em', marginBottom: 14 }}>
              Enterprise Analytics<br />for Modern Teams
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.75 }}>
              Monitor feature adoption, track license usage, and surface AI-driven insights across your entire tenant ecosystem.
            </div>
          </div>

          {/* Features list — no emojis, clean text with colored dots */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Real-time heatmaps & funnels',  color: '#3b82f6' },
              { label: 'License compliance tracking',   color: '#6366f1' },
              { label: 'AI-powered insights engine',    color: '#8b5cf6' },
              { label: 'Role-based access control',     color: '#06b6d4' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: f.color, flexShrink: 0,
                  boxShadow: `0 0 6px ${f.color}`,
                }} />
                <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Right Panel ─── */}
        <div style={{ flex: 1, padding: '48px 48px', overflowY: 'auto', maxHeight: '100vh', background: '#ffffff' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 6 }}>
              Sign in to your workspace
            </div>
            <div style={{ fontSize: 13.5, color: '#64748b' }}>
              Use your credentials or pick a demo role below
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@finspark.io" required style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: '#334155', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
                borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16,
                fontWeight: 500,
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '11px', borderRadius: 8,
              background: loading ? '#e2e8f0' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
              color: loading ? '#94a3b8' : '#ffffff', fontSize: 14, fontWeight: 600,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s, transform 0.15s',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(59,130,246,0.3)',
              fontFamily: 'Inter, sans-serif',
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{ marginTop: 28 }}>
            <div style={{
              fontSize: 11.5, fontWeight: 700, color: '#475569',
              letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10,
            }}>
              Demo Credentials — click to fill
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { type: 'admin',    label: 'Admin',    desc: 'All access',     color: '#3b82f6' },
                { type: 'viewer',   label: 'Viewer',   desc: 'Read only',      color: '#06b6d4' },
                { type: 'tenant_a', label: 'Tenant A', desc: 'tenant_a scope', color: '#10b981' },
                { type: 'tenant_b', label: 'Tenant B', desc: 'tenant_b scope', color: '#f59e0b' },
                { type: 'tenant_c', label: 'Tenant C', desc: 'tenant_c scope', color: '#ef4444' },
                { type: 'tenant_d', label: 'Tenant D', desc: 'tenant_d scope', color: '#8b5cf6' },
                { type: 'tenant_e', label: 'Tenant E', desc: 'tenant_e scope', color: '#ec4899' },
              ].map(u => (
                <button key={u.type} onClick={() => fillDemo(u.type)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                  background: '#f8fafc', border: '1.5px solid #e2e8f0',
                  textAlign: 'left', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = u.color; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = `0 0 0 3px ${u.color}18`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: u.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{u.label}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500, marginTop: 1 }}>{u.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

