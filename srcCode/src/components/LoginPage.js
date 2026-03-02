import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { theme, buttonStyles } from './calendarUtils';
import { BRANDING } from '../config';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (await login(username, password)) {
      navigate('/');
    } else {
      alert('Login failed');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f0f2f5',
      backgroundImage: 'linear-gradient(135deg, #f0f2f5 0%, #e2e6ea 100%)'
    }}>
      <div style={{ 
        maxWidth: 400, 
        width: '100%', 
        padding: '40px', 
        backgroundColor: theme.background, 
        borderRadius: '12px', 
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        borderTop: `6px solid ${theme.primary}`
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          {BRANDING.logoUrl && (
            <img 
              src={BRANDING.logoUrl} 
              alt="Logo" 
              style={{ height: '60px', marginBottom: '15px' }} 
            />
          )}
          <h2 style={{ color: theme.text, margin: '0 0 5px 0', fontSize: '1.5em' }}>{BRANDING.name}</h2>
          <p style={{ color: theme.textLight, margin: 0 }}>Schedule Draft Portal</p>
        </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: theme.text, fontSize: '0.9em' }}>Login ID</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${theme.border}`, boxSizing: 'border-box', fontSize: '1em' }}
          />
        </div>
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: theme.text, fontSize: '0.9em' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${theme.border}`, boxSizing: 'border-box', fontSize: '1em' }}
          />
        </div>
        <button type="submit" style={{ ...buttonStyles.base, ...buttonStyles.primary, width: '100%', padding: '14px', fontSize: '1.1em', marginTop: '10px' }}>Sign In</button>
      </form>
      </div>
    </div>
  );
};

export default LoginPage;
