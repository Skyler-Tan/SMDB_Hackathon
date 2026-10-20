<<<<<<< HEAD
import { useState } from 'react';
import { User, Lock, Camera } from 'lucide-react';
=======

import { useState } from 'react';
import { User, Lock, Mail, Phone } from 'lucide-react';

const ACCOUNTS_KEY = '34district_accounts';
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
<<<<<<< HEAD
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
=======
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getAccounts = () => {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
    } catch {
      return [];
    }
  };
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
<<<<<<< HEAD

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    // For demo purposes, accept any login
    const user = {
      username,
      points: 100,
      recycledItems: 0,
      reusedItems: 0
    };
    
    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-600">34district</h1>
          <p className="text-gray-600 mt-2">
=======
    setSuccess('');

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const normalizedPhone = cleanPhone.replace(/[\s()-]/g, '');

    if (!cleanUsername || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }

    const accounts = getAccounts();

    // SIGN UP
    if (isRegister) {
      if (!cleanEmail || !cleanPhone) {
        setError('Please enter your email and phone number.');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(cleanEmail)) {
        setError('Please enter a valid email address.');
        return;
      }

      const phoneRegex = /^(?:\+?60|0)1[0-9]{7,9}$/;

      if (!phoneRegex.test(normalizedPhone)) {
        setError(
          'Enter a valid Malaysian mobile number, e.g. 0123456789 or +60123456789.'
        );
        return;
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }

      const usernameExists = accounts.some(
        (account) =>
          account.username.toLowerCase() === cleanUsername.toLowerCase()
      );

      if (usernameExists) {
        setError('This username is already registered. Please log in.');
        return;
      }

      const emailExists = accounts.some(
        (account) => account.email === cleanEmail
      );

      if (emailExists) {
        setError('This email is already registered.');
        return;
      }

      const phoneExists = accounts.some(
        (account) =>
          account.phone.replace(/[\s()-]/g, '') === normalizedPhone
      );

      if (phoneExists) {
        setError('This phone number is already registered.');
        return;
      }

      const newAccount = {
        username: cleanUsername,
        password,
        email: cleanEmail,
        phone: cleanPhone,
        points: 100,
        recycledItems: 0,
        reusedItems: 0,
      };

      try {
        localStorage.setItem(
          ACCOUNTS_KEY,
          JSON.stringify([...accounts, newAccount])
        );
      } catch {
        setError('Unable to save your account in this browser.');
        return;
      }

      // Return to Login instead of entering the app.
      setIsRegister(false);
      setPassword('');
      setEmail('');
      setPhone('');
      setSuccess('Sign up successful! Please log in with your new account.');
      return;
    }

    // LOGIN
    const account = accounts.find(
      (savedAccount) =>
        savedAccount.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (!account) {
      setError('Username not found. Please sign up first.');
      return;
    }

    if (account.password !== password) {
      setError('Incorrect password. Please try again.');
      return;
    }

    // Only enter the app after credentials match.
    const { password: savedPassword, ...user } = account;
    onLogin(user);
  };

  const switchMode = () => {
    setIsRegister((previous) => !previous);
    setError('');
    setSuccess('');
    setPassword('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-green-600">
            34district
          </h1>
          <p className="mt-2 text-gray-600">
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
            {isRegister ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
<<<<<<< HEAD
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter username"
=======
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                maxLength={30}
                required
                placeholder="Enter username"
                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500"
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
              />
            </div>
          </div>

<<<<<<< HEAD
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter password"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
=======
          {isRegister && (
            <>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    maxLength={254}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Malaysian Phone Number
                </label>
                <div className="relative">
                  <Phone
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    maxLength={20}
                    required
                    placeholder="0123456789"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Example: 0123456789 or +60123456789
                </p>
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                minLength={isRegister ? 8 : undefined}
                required
                placeholder="Enter password"
                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {isRegister && (
              <p className="mt-1 text-xs text-gray-500">
                Password must be at least 8 characters.
              </p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
              {error}
            </div>
          )}

<<<<<<< HEAD
          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition"
=======
          {success && (
            <div
              role="status"
              className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700"
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
          >
            {isRegister ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
<<<<<<< HEAD
            onClick={() => setIsRegister(!isRegister)}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>
=======
            type="button"
            onClick={switchMode}
            className="font-medium text-green-600 hover:text-green-700"
          >
            {isRegister
              ? 'Already have an account? Login'
              : "Don't have an account? Sign Up"}
          </button>
        </div>

        {isRegister && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Email and phone verification are not enabled yet.
          </p>
        )}
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
      </div>
    </div>
  );
}
