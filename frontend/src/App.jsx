import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Mic, LayoutDashboard, History, Sparkles, Radio } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Generator from './pages/Generator';
import Player from './pages/Player';
import Shows from './pages/Shows';
import { AudioPlayerProvider } from './context/AudioPlayerContext';
import BottomPlayer from './components/BottomPlayer';

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
    <aside className="w-64 glass-panel border-l-0 border-y-0 rounded-none rounded-r-3xl flex flex-col p-6 min-h-screen flex-shrink-0 z-10">
      <div className="flex items-center gap-3 text-white mb-10">
        <div className="w-10 h-10 rounded-xl bg-white text-[#0a0a0a] flex items-center justify-center shadow-sm">
          <Mic size={20} />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-[#fafafa]">AI Podcast</h1>
          <span className="text-[11px] text-[#737373] font-mono tracking-wider uppercase">Studio</span>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1.5" aria-label="Main Navigation">
        {links.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.path);
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors duration-150 ${
                active 
                  ? 'bg-white/[0.07] text-[#fafafa] font-semibold border border-white/[0.12] shadow-sm before:content-[""] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-white before:rounded-r' 
                  : 'text-[#a3a3a3] hover:text-[#fafafa] hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <Icon size={18} className={active ? 'text-white' : 'text-[#737373]'} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="pt-6 border-t border-white/[0.06] text-xs text-[#737373] text-center">
        Editorial Audio Studio
      </div>
    </aside>
  );
};

function App() {
  return (
    <Router>
      <AudioPlayerProvider>
        <div className="flex bg-background min-h-screen text-[#fafafa] font-sans selection:bg-white/20 selection:text-white relative overflow-x-hidden">
          <Sidebar />
          <main className="flex-1 p-8 pb-36 overflow-y-auto relative h-screen">
            {/* Very faint white radial highlight (under 3% opacity) */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[140px] pointer-events-none -z-10" />
            
            <div className="max-w-6xl mx-auto animate-fade-in">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/shows" element={<Shows />} />
                <Route path="/generator" element={<Generator />} />
                <Route path="/history" element={<Player />} />
              </Routes>
            </div>
          </main>
          <BottomPlayer />
        </div>
      </AudioPlayerProvider>
    </Router>
  );
}

export default App;
