import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { theme } from './calendarUtils';
import { BRANDING } from '../config';

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkStyle = {
    textDecoration: 'none',
    color: theme.primary,
    fontWeight: 'bold',
    display: 'block',
    padding: '8px 0',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{
        backgroundColor: theme.background,
        color: theme.text,
        borderTop: `5px solid ${theme.primary}`,
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {BRANDING.logoUrl && (
            <img 
              src={BRANDING.logoUrl} 
              alt={`${BRANDING.name} Logo`} 
              style={{ height: '40px', width: 'auto' }} 
            />
          )}
          <div>
            <h1 style={{ fontSize: '1.2em', margin: 0, fontWeight: 'bold', color: theme.primary }}>{BRANDING.name}</h1>
            <div style={{ fontSize: '0.8em', color: theme.textLight }}>Basketball Schedule Draft</div>
          </div>
        </div>
        <div>
          <span style={{ marginRight: '20px' }}>Welcome, {user.name} ({user.role})</span>
          <button onClick={handleLogout} style={{
            backgroundColor: theme.danger,
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Logout
          </button>
        </div>
      </header>
      <div style={{ display: 'flex', flex: 1 }}>
        <nav style={{
          width: '220px',
          backgroundColor: theme.light,
          borderRight: `1px solid ${theme.border}`,
          padding: '20px'
        }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {user.role === 'siteAdmin' && (
              <>
                <li style={{ marginBottom: '10px' }}><Link to="/calendar" style={linkStyle}>Coaches View</Link></li>
                <hr style={{ margin: '15px 0', border: 'none', borderTop: `1px solid ${theme.border}` }} />
                <li style={{ marginBottom: '10px', color: theme.textLight, fontSize: '0.85em', fontWeight: 'bold', textTransform: 'uppercase' }}>Admin</li>
                <li style={{ marginBottom: '10px' }}><Link to="/coaches" style={linkStyle}>Coaches</Link></li>
                <li style={{ marginBottom: '10px' }}><Link to="/slots" style={linkStyle}>Schedule Slots</Link></li>
                <li style={{ marginBottom: '10px' }}><Link to="/final-selections" style={linkStyle}>Final Selections</Link></li>
              </>
            )}
            {user.role === 'coach' && (
              <>
                <li style={{ marginBottom: '10px' }}><Link to="/" style={linkStyle}>My Schedule</Link></li>
              </>
            )}
          </ul>
        </nav>
        <main style={{ flex: 1, padding: '20px', backgroundColor: '#f0f2f5', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
      <footer style={{
        backgroundColor: theme.light,
        padding: '15px 20px',
        textAlign: 'center',
        borderTop: `1px solid ${theme.border}`,
        color: theme.textLight,
        fontSize: '0.9em'
      }}>
        &copy; {new Date().getFullYear()} {BRANDING.name}. All rights reserved. | Contact: <a href={`mailto:${BRANDING.contactEmail}`} style={{ color: theme.primary }}>{BRANDING.contactEmail}</a>
      </footer>
    </div>
  );
};

export default Layout;