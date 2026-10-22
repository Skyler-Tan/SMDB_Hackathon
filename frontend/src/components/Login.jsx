import { useState, useEffect, useRef } from 'react';
import { User, Lock, Mail, Phone, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { authApi } from '../api/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleNativeReady, setGoogleNativeReady] = useState(false);

  const googleButtonRef = useRef(null);
  const googleCallbackRef = useRef(null);

  const isNative = Capacitor.isNativePlatform();

  // Native Google sign-in initialization for Android.
  useEffect(() => {
    if (!isNative || !GOOGLE_CLIENT_ID) {
      return;
    }

    let cancelled = false;

    const initializeGoogle = async () => {
      try {
        await SocialLogin.initialize({
          google: {
            webClientId: GOOGLE_CLIENT_ID,
            mode: 'online',
          },
        });

        if (!cancelled) {
          setGoogleNativeReady(true);
        }
      } catch (err) {
        console.error('Native Google initialization failed:', err);

        if (!cancelled) {
          setError('Unable to initialize Google sign-in. Please try again.');
        }
      }
    };

    initializeGoogle();

    return () => {
      cancelled = true;
    };
  }, [isNative]);

  // Existing Google sign-in callback for the website.
  googleCallbackRef.current = async (response) => {
    if (!response?.credential) {
      setError('Google sign-in failed. Please try again.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const result = await authApi.googleLogin(response.credential);
      onLogin(result.data);
    } catch (err) {
      console.error('Google login failed:', err);
      setError(
        err.response?.data?.message ||
          'Google sign-in failed. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  // Keep the existing web Google button.
  // Do not load the web OAuth button inside the native Android app.
  useEffect(() => {
    if (
      isNative ||
      isRegister ||
      !GOOGLE_CLIENT_ID ||
      !googleButtonRef.current
    ) {
      return;
    }

    let cancelled = false;
    let retryInterval;

    const renderGoogleButton = () => {
      if (
        cancelled ||
        !window.google?.accounts?.id ||
        !googleButtonRef.current
      ) {
        return false;
      }

      window.clearInterval(retryInterval);
      googleButtonRef.current.innerHTML = '';

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => googleCallbackRef.current?.(response),
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 320,
      });

      return true;
    };

    if (renderGoogleButton()) {
      return () => {
        cancelled = true;
        window.clearInterval(retryInterval);
      };
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existingScript) {
      existingScript.addEventListener('load', renderGoogleButton);

      retryInterval = window.setInterval(() => {
        renderGoogleButton();
      }, 200);
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleButton;
      script.onerror = () => {
        if (!cancelled) {
          setError('Unable to load Google sign-in. Please try again later.');
        }
      };

      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      window.clearInterval(retryInterval);

      if (existingScript) {
        existingScript.removeEventListener('load', renderGoogleButton);
      }
    };
  }, [isNative, isRegister]);

  // Native Google sign-in for Android.
  const handleNativeGoogleLogin = async () => {
    if (busy || !googleNativeReady) {
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const response = await SocialLogin.login({
  provider: 'google',
  options: {},
});

      const credential = response.result?.idToken;

      if (!credential) {
        console.error('Google sign-in response did not contain an ID token:', response);
        throw new Error(
          'Google sign-in did not return an ID token. Please try again.'
        );
      }

      // Reuse the existing Spring Boot endpoint.
      const result = await authApi.googleLogin(credential);
      onLogin(result.data);
    } catch (err) {
      console.error('Native Google login failed:', err);

      setError(
        err.response?.data?.message ||
          err.message ||
          'Google sign-in failed. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (busy) return;

    setError('');
    setSuccess('');

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.replace(/[\s()-]/g, '');

    if (!cleanUsername || !password) {
      setError('Please enter your username and password.');
      return;
    }

    if (isRegister) {
      if (!cleanEmail || !normalizedPhone) {
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

      setBusy(true);

      try {
        await authApi.register({
          username: cleanUsername,
          email: cleanEmail,
          phone: normalizedPhone,
          password,
        });

        setIsRegister(false);
        setPassword('');
        setEmail('');
        setPhone('');
        setSuccess(
          'Sign up successful! Please log in with your new account.'
        );
      } catch (err) {
        console.error('Sign up failed:', err);
        setError(
          err.response?.data?.message ||
            'Could not reach the server. Please try again in a moment.'
        );
      } finally {
        setBusy(false);
      }

      return;
    }

    setBusy(true);

    try {
      const response = await authApi.login({
        username: cleanUsername,
        password,
      });

      onLogin(response.data);
    } catch (err) {
      console.error('Login failed:', err);
      setError(
        err.response?.data?.message ||
          'Could not reach the server. Please try again in a moment.'
      );
    } finally {
      setBusy(false);
    }
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
            {isRegister ? 'Create your account' : 'Welcome back'}
          </p>

          {!isRegister && (
            <p className="mt-1 text-sm text-gray-500">
              Sign in to continue to 34district.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
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
                disabled={busy}
                placeholder="Enter username"
                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              />
            </div>
          </div>

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
                    disabled={busy}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
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
                    disabled={busy}
                    placeholder="0123456789"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
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
                disabled={busy}
                placeholder="Enter password"
                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
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
              {error}
            </div>
          )}

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
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <Loader2 size={18} className="animate-spin" />}

            {busy
              ? 'Please wait...'
              : isRegister
                ? 'Sign Up'
                : 'Login'}
          </button>

          {busy && (
            <p className="text-center text-xs text-gray-500">
              The server may take a few seconds to wake up.
            </p>
          )}
        </form>

        {!isRegister && (
          <div className="mt-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-500">
                OR CONTINUE WITH
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="flex min-h-[40px] justify-center">
              {!GOOGLE_CLIENT_ID ? (
                <p className="text-center text-sm text-gray-500">
                  Google sign-in is not configured yet.
                </p>
              ) : isNative ? (
                <button
                  type="button"
                  onClick={handleNativeGoogleLogin}
                  disabled={busy || !googleNativeReady}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {busy
                    ? 'Please wait...'
                    : googleNativeReady
                      ? 'Continue with Google'
                      : 'Loading Google sign-in...'}
                </button>
              ) : (
                <div
                  ref={googleButtonRef}
                  className={busy ? 'pointer-events-none opacity-60' : ''}
                />
              )}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={switchMode}
            disabled={busy}
            className="font-medium text-green-600 hover:text-green-700 disabled:opacity-60"
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
      </div>
    </div>
  );
}