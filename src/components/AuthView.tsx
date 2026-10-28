import { useState, useId } from 'react';
import {
  Scales, Eye, EyeSlash, ArrowRight, CheckCircle, WarningCircle,
  GoogleLogo, ArrowLeft, ShieldCheck, UserCheck
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n/translations';
import type { Language } from '../types';

interface AuthViewProps {
  initialMode?: 'login' | 'signup' | 'reset';
  lang: Language;
  onSuccess: () => void;
  onCancel?: () => void;
  stats?: {
    totalTaluks: number;
    gapsCount: number;
    peopleAffected: string;
  };
}

export default function AuthView({
  initialMode = 'login',
  lang,
  onSuccess,
  onCancel,
  stats,
}: AuthViewProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errors.email = lang === 'kn' ? 'ದಯವಿಟ್ಟು ಇಮೇಲ್ ನಮೂದಿಸಿ' : 'Email is required';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = lang === 'kn' ? 'ಮಾನ್ಯವಾದ ಇಮೇಲ್ ನಮೂದಿಸಿ' : 'Enter a valid email address';
    }

    if (mode !== 'reset') {
      if (!password) {
        errors.password = lang === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ಅಗತ್ಯವಿದೆ' : 'Password is required';
      } else if (password.length < 6) {
        errors.password = lang === 'kn' ? 'ಕನಿಷ್ಠ 6 ಅಕ್ಷರಗಳಿರಬೇಕು' : 'Password must be at least 6 characters';
      }

      if (mode === 'signup' && password !== confirmPassword) {
        errors.confirmPassword = lang === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ' : 'Passwords do not match';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submit
    setGeneralError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) {
          // Do not reveal whether account exists
          setGeneralError(
            lang === 'kn'
              ? 'ಇಮೇಲ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ ಅಮಾನ್ಯವಾಗಿದೆ'
              : 'Invalid email or password combination'
          );
        } else {
          onSuccess();
        }
      } else if (mode === 'signup') {
        const { error } = await signUpWithEmail(email.trim(), password);
        if (error) {
          setGeneralError(
            lang === 'kn'
              ? 'ಖಾತೆ ರಚಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.'
              : 'Could not create account. Please try again.'
          );
        } else {
          setSuccessMessage(
            lang === 'kn'
              ? 'ಖಾತೆ ಯಶಸ್ವಿಯಾಗಿ ರಚಿಸಲಾಗಿದೆ. ಲಾಗ್ ಇನ್ ಆಗುತ್ತಿದ್ದೀರಿ...'
              : 'Account created successfully. Logging in...'
          );
          setTimeout(() => onSuccess(), 1000);
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email.trim());
        if (error) {
          setGeneralError(
            lang === 'kn'
              ? 'ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸುವ ವಿನಂತಿ ವಿಫಲವಾಗಿದೆ'
              : 'Unable to process reset request. Please check email address.'
          );
        } else {
          setSuccessMessage(
            lang === 'kn'
              ? 'ನಿಮ್ಮ ಇಮೇಲ್ ಖಾತೆಗೆ ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸುವ ಲಿಂಕ್ ಕಳುಹಿಸಲಾಗಿದೆ'
              : 'If an account exists, a password reset link has been dispatched to your email.'
          );
        }
      }
    } catch {
      setGeneralError(
        lang === 'kn'
          ? 'ಅನಿರೀಕ್ಷಿತ ದೋಷ ಸಂಭವಿಸಿದೆ'
          : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setGeneralError(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setGeneralError(error.message);
      } else {
        onSuccess();
      }
    } catch {
      setGeneralError('Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    onSuccess();
  };

  return (
    <div
      className="w-full max-w-5xl mx-auto my-6 md:my-12 rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 border"
      style={{
        background: 'var(--color-surface-0)',
        borderColor: 'var(--color-surface-2)',
        boxShadow: 'var(--shadow-xl)',
      }}
    >
      {/* Editorial Side Panel */}
      <div
        className="md:col-span-5 p-8 md:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r"
        style={{
          background: 'var(--color-surface-1)',
          borderColor: 'var(--color-surface-2)',
        }}
      >
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Scales size={28} weight="duotone" style={{ color: 'var(--color-accent)' }} />
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink-primary)' }}
            >
              {t('app_title', lang)}
            </span>
          </div>

          <div className="space-y-4">
            <span
              className="font-label text-xs uppercase tracking-wider px-2.5 py-1 rounded-full font-semibold"
              style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
            >
              {lang === 'kn' ? 'ಸಂಶೋಧನೆ ಮತ್ತು ಸಾರ್ವಜನಿಕ ನೀತಿ' : 'Research & Public Policy'}
            </span>

            <h2
              className="font-display text-2xl md:text-3xl leading-snug"
              style={{ color: 'var(--color-ink-primary)' }}
            >
              {stats ? (
                <>
                  <span className="font-stat text-3xl font-bold" style={{ color: 'var(--color-status-danger)', fontFamily: 'var(--font-mono)' }}>
                    {stats.gapsCount}
                  </span>{' '}
                  {lang === 'kn' ? 'ತಾಲ್ಲೂಕುಗಳಲ್ಲಿ ತಕ್ಷಣದ ಕಾನೂನು ನೆರವು ಕೊರತೆ ಇದೆ.' : 'taluks lack direct access to free legal services.'}
                </>
              ) : (
                lang === 'kn'
                  ? 'ನ್ಯಾಯ ಎಲ್ಲರಿಗೂ ಸಮಾನವಾಗಿ ಸಿಗುವಂತೆ ಮಾಡುವುದು ನಮ್ಮ ಗುರಿ.'
                  : 'Evidence-based transparency for legal aid access across Karnataka.'
              )}
            </h2>

            <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--color-ink-secondary)' }}>
              {lang === 'kn'
                ? 'ಕರ್ನಾಟಕದಾದ್ಯಂತ ಉಚಿತ ಕಾನೂನು ನೆರವು ಕೊರತೆಗಳನ್ನು ಗುರುತಿಸಲು ಮತ್ತು ಸುಧಾರಿಸಲು ನೀತಿ ನಿರೂಪಕರು ಹಾಗೂ ನಾಗರಿಕರಿಗೆ ವಿಶ್ಲೇಷಣೆ ಒದಗಿಸುತ್ತದೆ.'
                : 'Sign in to access deep statistical analysis, district disparity charts, and the data-grounded AI access assistant.'}
            </p>
          </div>
        </div>

        {/* Privacy Note */}
        <div
          className="mt-8 p-4 rounded-xl flex items-start gap-3 border text-xs"
          style={{
            background: 'var(--color-surface-0)',
            borderColor: 'var(--color-surface-2)',
            color: 'var(--color-ink-secondary)',
          }}
        >
          <ShieldCheck size={20} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong className="block mb-1" style={{ color: 'var(--color-ink-primary)' }}>
              {lang === 'kn' ? 'ಗೌಪ್ಯತೆ ಗ್ಯಾರಂಟಿ' : 'Privacy & Data Protection'}
            </strong>
            {lang === 'kn'
              ? 'ನಾವು ದೃಢೀಕರಣಕ್ಕಾಗಿ ಕೇವಲ ಇಮೇಲ್ ಮಾತ್ರ ಸಂಗ್ರಹಿಸುತ್ತೇವೆ. ಯಾವುದೇ ವೈಯಕ್ತಿಕ ಕೇಸ್ ವಿವರಗಳು ಅಥವಾ ಬ್ರೌಸಿಂಗ್ ಲಾಗ್ ಇಡಲಾಗುವುದಿಲ್ಲ.'
              : 'We only store your email for session access. We never store personal legal case details, geolocation logs, or tracking cookies.'}
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto">
          {onCancel && (
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs font-medium mb-6 transition-colors"
              style={{ color: 'var(--color-ink-secondary)' }}
            >
              <ArrowLeft size={16} />
              {lang === 'kn' ? 'ನಕ್ಷೆಗೆ ಹಿಂತಿರುಗಿ' : 'Back to Public Map'}
            </button>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-3 mb-6 border-b pb-3" style={{ borderColor: 'var(--color-surface-2)' }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setGeneralError(null); setSuccessMessage(null); }}
              className={`text-base font-semibold transition-colors pb-1 border-b-2 ${mode === 'login' ? 'border-[var(--color-accent)]' : 'border-transparent text-[var(--color-ink-tertiary)]'}`}
              style={{ color: mode === 'login' ? 'var(--color-ink-primary)' : undefined }}
            >
              {lang === 'kn' ? 'ಲಾಗಿನ್' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setGeneralError(null); setSuccessMessage(null); }}
              className={`text-base font-semibold transition-colors pb-1 border-b-2 ${mode === 'signup' ? 'border-[var(--color-accent)]' : 'border-transparent text-[var(--color-ink-tertiary)]'}`}
              style={{ color: mode === 'signup' ? 'var(--color-ink-primary)' : undefined }}
            >
              {lang === 'kn' ? 'ಖಾತೆ ರಚಿಸಿ' : 'Create Account'}
            </button>
            {mode === 'reset' && (
              <span className="text-base font-semibold pb-1 border-b-2 border-[var(--color-accent)]" style={{ color: 'var(--color-ink-primary)' }}>
                {lang === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸಿ' : 'Reset Password'}
              </span>
            )}
          </div>

          {/* Feedback alerts */}
          {generalError && (
            <div
              className="mb-6 p-3.5 rounded-xl flex items-start gap-2.5 text-sm"
              style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #F87171' }}
              role="alert"
            >
              <WarningCircle size={20} className="flex-shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          {successMessage && (
            <div
              className="mb-6 p-3.5 rounded-xl flex items-start gap-2.5 text-sm"
              style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #4ADE80' }}
              role="status"
            >
              <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Social Auth Option */}
          {mode !== 'reset' && (
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium text-sm border transition-all hover:bg-[var(--color-surface-1)] active:scale-[0.99]"
                style={{
                  minHeight: '44px',
                  borderColor: 'var(--color-surface-2)',
                  color: 'var(--color-ink-primary)',
                  background: 'var(--color-surface-0)',
                }}
              >
                <GoogleLogo size={20} weight="bold" />
                <span>{lang === 'kn' ? 'Google ಮೂಲಕ ಮುಂದುವರಿಯಿರಿ' : 'Continue with Google'}</span>
              </button>

              <div className="relative my-6 text-center">
                <hr style={{ borderColor: 'var(--color-surface-2)' }} />
                <span
                  className="absolute left-1/2 -translate-x-1/2 -top-2.5 px-3 text-xs"
                  style={{ background: 'var(--color-surface-0)', color: 'var(--color-ink-tertiary)' }}
                >
                  {lang === 'kn' ? 'ಅಥವಾ ಇಮೇಲ್ ಬಳಸಿ' : 'or with email'}
                </span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor={emailId}
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-ink-secondary)' }}
              >
                {lang === 'kn' ? 'ಇಮೇಲ್ ವಿಳಾಸ' : 'Email Address'} <span style={{ color: 'var(--color-status-danger)' }}>*</span>
              </label>
              <input
                id={emailId}
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.org"
                className={`w-full px-3.5 py-2.5 rounded-lg text-sm border transition-all outline-none ${
                  fieldErrors.email ? 'border-red-500' : 'focus:border-[var(--color-accent)]'
                }`}
                style={{
                  minHeight: '44px',
                  background: 'var(--color-surface-1)',
                  color: 'var(--color-ink-primary)',
                  borderColor: fieldErrors.email ? 'var(--color-status-danger)' : 'var(--color-surface-2)',
                }}
              />
              {fieldErrors.email && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-status-danger)' }}>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor={passwordId}
                    className="block text-xs font-medium"
                    style={{ color: 'var(--color-ink-secondary)' }}
                  >
                    {lang === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್' : 'Password'} <span style={{ color: 'var(--color-status-danger)' }}>*</span>
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setGeneralError(null); }}
                      className="text-xs transition-colors hover:underline"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {lang === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?' : 'Forgot password?'}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    id={passwordId}
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-3.5 pr-11 py-2.5 rounded-lg text-sm border transition-all outline-none ${
                      fieldErrors.password ? 'border-red-500' : 'focus:border-[var(--color-accent)]'
                    }`}
                    style={{
                      minHeight: '44px',
                      background: 'var(--color-surface-1)',
                      color: 'var(--color-ink-primary)',
                      borderColor: fieldErrors.password ? 'var(--color-status-danger)' : 'var(--color-surface-2)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-status-danger)' }}>
                    {fieldErrors.password}
                  </p>
                )}
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label
                  htmlFor={confirmPasswordId}
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--color-ink-secondary)' }}
                >
                  {lang === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ' : 'Confirm Password'} <span style={{ color: 'var(--color-status-danger)' }}>*</span>
                </label>
                <input
                  id={confirmPasswordId}
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm border transition-all outline-none ${
                    fieldErrors.confirmPassword ? 'border-red-500' : 'focus:border-[var(--color-accent)]'
                  }`}
                  style={{
                    minHeight: '44px',
                    background: 'var(--color-surface-1)',
                    color: 'var(--color-ink-primary)',
                    borderColor: fieldErrors.confirmPassword ? 'var(--color-status-danger)' : 'var(--color-surface-2)',
                  }}
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-status-danger)' }}>
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all active:scale-[0.99] disabled:opacity-50"
              style={{
                minHeight: '44px',
                background: 'var(--color-accent)',
                color: '#ffffff',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'login'
                      ? (lang === 'kn' ? 'ಲಾಗಿನ್ ಆಗಿ' : 'Sign In')
                      : mode === 'signup'
                      ? (lang === 'kn' ? 'ಖಾತೆ ರಚಿಸಿ' : 'Create Account')
                      : (lang === 'kn' ? 'ರೀಸೆಟ್ ಲಿಂಕ್ ಕಳುಹಿಸಿ' : 'Send Reset Link')}
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Guest Mode Callout */}
          <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: 'var(--color-surface-2)' }}>
            <p className="text-xs mb-3" style={{ color: 'var(--color-ink-tertiary)' }}>
              {lang === 'kn' ? 'ಪರೀಕ್ಷಾರ್ಥ ವೀಕ್ಷಣೆಗಾಗಿ ಲಾಗಿನ್ ಇಲ್ಲದೆ ಪ್ರವೇಶಿಸಿ:' : 'Evaluating the hackathon demo?'}
            </p>
            <button
              type="button"
              onClick={handleGuest}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:border-[var(--color-accent)] active:scale-[0.99]"
              style={{
                minHeight: '44px',
                background: 'var(--color-accent-subtle)',
                color: 'var(--color-accent)',
                borderColor: 'var(--color-accent)',
              }}
            >
              <UserCheck size={18} />
              <span>{lang === 'kn' ? 'ಅತಿಥಿಯಾಗಿ ಮುಂದುವರಿಯಿರಿ (ಡೆಮೊ ಅನ್‌ಲಾಕ್)' : 'Continue as guest (demo)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
