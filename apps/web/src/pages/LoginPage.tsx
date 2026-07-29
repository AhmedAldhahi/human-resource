import React, { useState, useEffect, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

import ThemeSwitcher from '../components/ThemeSwitcher';
import LanguageSwitcher from '../components/LanguageSwitcher';

const REMEMBER_ME_KEY = 'hrms_remember_me';
const REMEMBER_EMAIL_KEY = 'hrms_remember_email';
const REMEMBER_PASSWORD_KEY = 'hrms_remember_password';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const { t, isRtl } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const isRemembered = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    if (isRemembered) {
      const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
      const savedPassword = localStorage.getItem(REMEMBER_PASSWORD_KEY) || '';
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);

      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, 'true');
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
        localStorage.setItem(REMEMBER_PASSWORD_KEY, password);
      } else {
        localStorage.setItem(REMEMBER_ME_KEY, 'false');
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
        localStorage.removeItem(REMEMBER_PASSWORD_KEY);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message;
      if (msg) {
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      } else {
        setError(t('invalid_credentials'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden transition-colors duration-300 bg-slate-950 py-12">
      {/* Top right Theme & Language Switchers */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <LanguageSwitcher compact />
        <ThemeSwitcher compact />
      </div>

      {/* Dynamic Background theme glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 bg-amber-500" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 bg-purple-600" />
      </div>

      {/* Card Wrapper */}
      <div className="relative w-full max-w-lg z-10 space-y-6">
        {/* Maintenance / Lockdown Banner */}
        <div className="glass-card p-8 sm:p-10 text-center space-y-6 border-2 border-amber-500/40 shadow-2xl bg-slate-900/90 relative overflow-hidden rounded-3xl">
          {/* Top Yellow Warning Strip */}
          <div className="h-2 w-full bg-[repeating-linear-gradient(45deg,#eab308,#eab308_15px,#000_15px,#000_30px)] absolute top-0 left-0 right-0 shadow-md" />

          {/* Icon */}
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-3xl shadow-xl text-amber-400 animate-pulse">
            🔒
          </div>

          {/* Message Headers */}
          <div className="space-y-3">
            <h1 className="text-xl sm:text-2xl font-black text-amber-400 tracking-wide uppercase">
              return to the google sheets
            </h1>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <h2 className="text-lg sm:text-xl font-black text-white" dir="rtl">
                عود نخابركم من يرجع البرنامج 📞
              </h2>
              <p className="text-xs text-amber-200/80 leading-relaxed" dir="rtl">
                تم تعليق وتسجيل الخروج من كافة الحسابات مؤقتاً. الاعتماد حالياً على مستندات Google Sheets.
              </p>
            </div>
          </div>

          {/* Bottom Yellow Warning Strip */}
          <div className="h-2 w-full bg-[repeating-linear-gradient(45deg,#eab308,#eab308_15px,#000_15px,#000_30px)] absolute bottom-0 left-0 right-0 shadow-md" />
        </div>

        {/* System Admin Portal Login Form */}
        <div className="glass-card p-6 sm:p-8 space-y-6 border border-white/10 rounded-3xl bg-slate-900/80 shadow-xl">
          <div className="text-center space-y-1">
            <h3 className="text-sm font-extrabold text-indigo-300 uppercase tracking-wider">
              👑 System Admin Portal Only
            </h3>
            <p className="text-xs text-slate-400">
              {isRtl ? 'خاص بمدير النظام الرئيسي فقط' : 'Restricted to System Administrator logins'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-300 whitespace-pre-line text-center leading-relaxed">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                {t('email_address')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field py-2.5 text-xs bg-slate-950 text-white"
                placeholder="admin@hrms.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                {t('password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field py-2.5 text-xs bg-slate-950 text-white"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors ${
                    isRtl ? 'left-3' : 'right-3'
                  }`}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="gradient-btn w-full py-3 text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('signing_in')}</span>
                </>
              ) : (
                <span>👑 System Admin Login</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs">
          &copy; {new Date().getFullYear()} Ahmed Aldhahi — System Admin Control
        </p>
      </div>
    </div>
  );
}
