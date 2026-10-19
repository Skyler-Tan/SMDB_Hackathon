import { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from 'react-router-dom';
import {
  Scan,
  Home as HomeIcon,
  Users,
  User,
  Sun,
  Moon,
  ShoppingBag,
} from 'lucide-react';

import ScanComponent from './components/Scan';
import Catalog from './components/Catalog';
import Rewards from './components/Rewards';
import Login from './components/Login';
import Profile from './components/Profile';
import Community from './components/Community';
import FetchRecyclingCentre from './components/FetchRecyclingCentre';
import History from './components/History';
import RecycleHistory from './components/RecycleHistory';
import Home from './components/Home';
import Marketplace from './components/Marketplace';
import SavedIdeas from './components/SavedIdeas';

function Navigation() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Home', Icon: HomeIcon },
    { path: '/scan', label: 'Scan', Icon: Scan },
    { path: '/community', label: 'Community', Icon: Users },
    { path: '/market', label: 'Market', Icon: ShoppingBag },
    { path: '/profile', label: 'Profile', Icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-3xl mx-auto flex items-center justify-around overflow-x-auto">
        {navItems.map(({ path, label, Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center justify-center shrink-0 min-w-[68px] px-2 py-2 ${
              isActive(path) ? 'text-green-600' : 'text-gray-600'
            }`}
          >
            <Icon size={22} />
            <span className="text-[10px] mt-1 whitespace-nowrap">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('34district-theme') === 'dark');

  const userId = user?.id ?? user?._id ?? user?.userId ?? user?.username ?? user?.email ?? 'demo-user';

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleEditProfile = (updatedUser) => {
    setUser(updatedUser);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className={`app-shell min-h-screen pb-24 transition-colors ${darkMode ? 'dark-mode bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
        <header className="relative bg-[#74C365] p-4 text-white shadow-md">
          <h1 className="text-xl font-bold text-center">34district</h1>
          <p className="text-center text-sm text-green-100">Recycle, Reuse, Reduce</p>
          <button type="button" onClick={() => setDarkMode((current) => { const next = !current; localStorage.setItem('34district-theme', next ? 'dark' : 'light'); return next; })} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 transition hover:bg-white/25" aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>{darkMode ? <Sun size={19}/> : <Moon size={19}/>}</button>
        </header>

        <main className="pt-6">
          <Routes>
            <Route
              path="/"
              element={<Home />}
            />

            <Route
              path="/scan"
              element={<ScanComponent userId={userId} />}
            />

            <Route
              path="/catalog"
              element={<Catalog onSelectItem={() => {}} />}
            />

            <Route
              path="/map"
              element={<FetchRecyclingCentre />}
            />

            <Route
              path="/rewards"
              element={<Rewards userId={userId} />}
            />

            <Route
              path="/community"
              element={<Community userId={userId} />}
            />

            <Route
             path="/market"
             element={<Marketplace userId={userId} user={user} />}
             />

             <Route path="/saved-ideas" element={<SavedIdeas userId={userId} />} />

            <Route
              path="/history"
              element={<History userId={userId} />}
            />

            <Route
              path="/recycle-history"
              element={<RecycleHistory userId={userId} />}
            />

            <Route
              path="/profile"
              element={
                <Profile
                  user={user}
                  onLogout={handleLogout}
                  onEditProfile={handleEditProfile}
                  userId={userId}
                />
              }
            />
          </Routes>
        </main>

        <Navigation />
      </div>
    </Router>
  );
}

export default App;