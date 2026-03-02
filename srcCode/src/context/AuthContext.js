import React, { createContext, useState } from 'react';
import { supabase } from '../supabaseClient';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { role: 'coach'|'admin', name: '...' }

  const login = async (username, password) => {
    try {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('loginId', username)
        .eq('password', password)
        .maybeSingle();

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      if (data) {
        await supabase.from('coaches').update({ lastLogin: new Date().toISOString() }).eq('id', data.id);
        const role = data.isAdmin ? 'siteAdmin' : 'coach';
        setUser({ name: data.name, role, id: data.id });
        return true;
      }

      console.warn('Login failed: User not found or invalid credentials');
    } catch (err) {
      console.error('Login exception:', err);
    }
    return false;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
