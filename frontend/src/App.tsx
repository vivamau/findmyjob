import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Briefcase, FileText, Search, LayoutDashboard, Settings } from 'lucide-react';
import './App.css';

// Placeholder Pages
import Dashboard from './pages/Dashboard';
import JobSearch from './pages/JobSearch';
import CVManager from './pages/CVManager';
import Tracker from './pages/Tracker';

import SettingsPage from './pages/Settings';

function Sidebar() {
  return (
    <nav className="navbar">
      <div className="logo">
        <Briefcase size={28} />
        <span className="text-gradient">FindMyJob</span>
      </div>
      
      <div className="nav-links mt-8">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Search size={20} />
          <span>Job Search</span>
        </NavLink>
        <NavLink to="/cvs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileText size={20} />
          <span>My CVs</span>
        </NavLink>
        <NavLink to="/applications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Briefcase size={20} />
          <span>Applications</span>
        </NavLink>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <div className="bg-glow"></div>
        <div className="bg-glow-secondary"></div>
        
        <Sidebar />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<JobSearch />} />
            <Route path="/cvs" element={<CVManager />} />
            <Route path="/applications" element={<Tracker />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
