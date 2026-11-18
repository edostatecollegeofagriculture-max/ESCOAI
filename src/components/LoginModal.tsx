import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { login, registerApplicant, devQuickLogin } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        await registerApplicant({ email, password, fullName, phone });
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevQuickLogin = async (role: 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'INSTITUTION_ADMIN' | 'RECTOR' | 'REGISTRAR' | 'ADMISSIONS_OFFICER' | 'DEAN' | 'HOD' | 'LECTURER' | 'EXAM_OFFICER' | 'BURSAR' | 'CONTENT_EDITOR' | 'ICT_ADMIN' | 'SUPPORT_OFFICER' | 'STUDENT' | 'APPLICANT') => {
    setError(null);
    setLoading(true);

    try {
      await devQuickLogin(role);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Development quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 bg-linear-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🌾</span>
              <span className="font-bold text-base tracking-wide text-amber-300">EDOCASTI PORTAL</span>
            </div>
            <h2 className="text-lg font-bold mt-1">
              {isRegistering ? 'Create Applicant Account' : 'Portal Sign In'}
            </h2>
            <p className="text-xs text-emerald-200">
              {isRegistering
                ? 'Sign up for 2025/2026 ND & HND Admission Screening'
                : 'Enter your institutional email and secure credentials'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isRegistering && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name (Surname First)
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Omoregie Osaretin David"
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +234 803 123 4567"
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isRegistering ? 'Email Address' : 'Institutional / Applicant Email'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. student.agric@edocasti.edu.ng"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {loading ? (
              'Authenticating...'
            ) : isRegistering ? (
              <>
                <UserPlus className="w-4 h-4" /> Create Account & Proceed
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Secure Sign In
              </>
            )}
          </button>


          {import.meta.env.DEV && !isRegistering && (
            <div className="border-t border-dashed border-amber-300 dark:border-amber-800 pt-4 space-y-2">
              <p className="text-center text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Development Testing Only
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDevQuickLogin('SUPER_ADMIN')}
                  className="py-2 px-1 text-xs font-semibold rounded-lg bg-purple-700 hover:bg-purple-800 text-white disabled:opacity-50"
                >
                  Super Admin
                </button>
                {[
                  ['RECTOR', 'Rector'],
                  ['EXAM_OFFICER', 'Exam Officer'],
                  ['STUDENT', 'Student'],
                  ['APPLICANT', 'Applicant'],
                  ['DEAN', 'Dean'],
                  ['HOD', 'HOD'],
                  ['LECTURER', 'Lecturer'],
                  ['REGISTRAR', 'Registrar'],
                  ['BURSAR', 'Bursar'],
                ].map(([category, label]) => (
                  <button
                    key={category}
                    type="button"
                    disabled={loading}
                    onClick={() => handleDevQuickLogin(category as
                      'RECTOR' | 'EXAM_OFFICER' | 'STUDENT' | 'APPLICANT' |
                      'DEAN' | 'HOD' | 'LECTURER' | 'REGISTRAR' | 'BURSAR')}
                    className="py-2 px-1 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-800 text-white disabled:opacity-50"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {loading && (
                <p className="text-center text-xs text-slate-500">
                  Establishing development session...
                </p>
              )}
            </div>
          )}

          <div className="text-center pt-2 text-xs">
            {isRegistering ? (
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
              >
                Already have an account? Sign In
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
              >
                New applicant? Create an admission account
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

