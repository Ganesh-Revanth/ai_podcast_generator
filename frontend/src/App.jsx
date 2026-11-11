import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Mic, LayoutDashboard, History, Sparkles, Radio } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Generator from './pages/Generator';
import Player from './pages/Player';
import Shows from './pages/Shows';

const Sidebar = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const links = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Shows', path: '/shows', icon: Radio },
    { name: 'Generate', path: '/generator', icon: Sparkles },
    { name: 'History', path: '/history', icon: History },
  ];

  return (
    <div className="w-64 glass-panel border-l-0 border-y-0 rounded-none rounded-r-3xl flex flex-col p-6 min-h-screen">
      <div className="flex items-center gap-3 text-white mb-12">
        <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg shadow-primary/20">
          <Mic size={24} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">AI Podcast</h1>
      </div>
      
      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive(link.path) 
                  ? 'bg-primary/20 text-primary font-medium border border-primary/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={20} className={isActive(link.path) ? 'text-primary' : 'text-gray-400'} />
              {link.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="text-xs text-gray-500 mt-auto text-center">
        Powered by Generative AI
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="flex bg-background min-h-screen text-gray-100 font-sans selection:bg-primary/30">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto relative h-screen">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
          <div className="absolute bottom-0 left-[20%] w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px] pointer-events-none -z-10" />
          
          <div className="max-w-6xl mx-auto animate-fade-in">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/shows" element={<Shows />} />
              <Route path="/generator" element={<Generator />} />
              <Route path="/history" element={<Player />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
