import React, { useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import Calendar from './components/Calendar';
import ManageCoaches from './components/ManageCoaches';
import ManageScheduleSlots from './components/ManageScheduleSlots';
import FinalSelections from './components/FinalSelections';
import Layout from './components/Layout';

function AppContent() {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <Routes>
        {user.role === 'siteAdmin' && (
          <>
            <Route path="/" element={<Navigate to="/calendar" replace />} />
            <Route path="/coaches" element={<ManageCoaches />} />
            <Route path="/slots" element={<ManageScheduleSlots />} />
            <Route path="/final-selections" element={<FinalSelections />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
        {user.role === 'coach' && (
          <>
            <Route path="/" element={<Calendar />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
