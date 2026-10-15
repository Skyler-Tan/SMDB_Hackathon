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
  Home,
  Users,
  User,
  MapPin,
  History as HistoryIcon,
  Recycle,
} from 'lucide-react';

import ScanComponent from './components/Scan';
import Catalog from './components/Catalog';
import Rewards from './components/Rewards';
import Login from './components/Login';
import Profile from './components/Profile';
import Community from './components/Community';
import CommunityPosts from './components/CommunityPosts';
import FetchRecyclingCentre from './components/FetchRecyclingCentre';
import History from './components/History';
import RecycleHistory from './components/RecycleHistory';

function Navigation() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Home', Icon: Home },
    { path: '/scan', label: 'Scan', Icon: Scan },
    { path: '/map', label: 'Map', Icon: MapPin },
    { path: '/community', label: 'Community', Icon: Users },
    { path: '/history', label: 'Scan History', Icon: HistoryIcon },
    { path: '/recycle-history', label: 'Recycle History', Icon: Recycle },
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

  const userId = user?.id || 'demo-user';

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
      <div className="min-h-screen bg-gray-100 pb-20">
        <header className="bg-green-600 text-white p-4 shadow-md">
          <h1 className="text-xl font-bold text-center">34district</h1>
          <p className="text-center text-sm text-green-100">
            Recycle, Reuse, Reduce
          </p>
        </header>

        <main className="pt-6">
          <Routes>
            <Route
              path="/"
              element={<CommunityPosts userId={userId} />}
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