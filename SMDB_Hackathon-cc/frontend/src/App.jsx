import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Scan, Home, Users, User, MapPin } from 'lucide-react';
import ScanComponent from './components/Scan';
import Catalog from './components/Catalog';
import Rewards from './components/Rewards';
import Login from './components/Login';
import Profile from './components/Profile';
import Community from './components/Community';
import CommunityPosts from './components/CommunityPosts';
import FetchRecyclingCentre from './components/FetchRecyclingCentre';

function Navigation({ user }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="max-w-md mx-auto flex justify-around">
        <Link
          to="/"
          className={`flex flex-col items-center p-2 rounded-lg ${
            isActive('/') ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <Home size={24} />
          <span className="text-xs mt-1">Home</span>
        </Link>
        <Link
          to="/scan"
          className={`flex flex-col items-center p-2 rounded-lg ${
            isActive('/scan') ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <Scan size={24} />
          <span className="text-xs mt-1">Scan</span>
        </Link>
        <Link
          to="/map"
          className={`flex flex-col items-center p-2 rounded-lg ${
            isActive('/map') ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <MapPin size={24} />
          <span className="text-xs mt-1">Map</span>
        </Link>
        <Link
          to="/community"
          className={`flex flex-col items-center p-2 rounded-lg ${
            isActive('/community') ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <Users size={24} />
          <span className="text-xs mt-1">Community</span>
        </Link>
        <Link
          to="/profile"
          className={`flex flex-col items-center p-2 rounded-lg ${
            isActive('/profile') ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <User size={24} />
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </div>
    </nav>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const userId = user?.id || 'demo-user';

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => setUser(null);
  const handleEditProfile = (updatedUser) => setUser(updatedUser);

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 pb-20">
        <header className="bg-green-600 text-white p-4 shadow-md">
          <h1 className="text-xl font-bold text-center">34district</h1>
          <p className="text-center text-sm text-green-100">Recycle, Reuse, Reduce</p>
        </header>

        <main className="pt-6">
          <Routes>
            <Route path="/" element={<CommunityPosts userId={userId} />} />
            <Route path="/scan" element={<ScanComponent userId={userId} />} />
            <Route path="/catalog" element={<Catalog onSelectItem={() => {}} />} />
            <Route path="/map" element={<FetchRecyclingCentre />} />
            <Route path="/rewards" element={<Rewards userId={userId} />} />
            <Route path="/community" element={<Community userId={userId} />} />
            <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} onEditProfile={handleEditProfile} userId={userId} />} />
          </Routes>


        </main>

        <Navigation user={user} />
      </div>
    </Router>
  );
}

export default App;
