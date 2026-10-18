import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from './AuthLayout';
import AuthAgreement from './AuthAgreement';
import { useAuthPageTranslation } from './authI18n';
import { login } from '@/api/auth';
import { ApiError } from '@/api/http';
import { useUserStore } from '@/store/userStore';
import { toast } from '@/components/Toast';
import { getSafeRedirect, withRedirect } from './authRedirect';

type Tab = 'phone' | 'email_account';

function isGoogleCodeRequiredError(error: unknown) {
  if (error instanceof ApiError && error.code === 1005) return true;
  const msg = error instanceof Error ? error.message : '';
  return msg.includes('验证码') || msg.toLowerCase().includes('verification code');
}

export default function LoginPage() {
  const { t } = useAuthPageTranslation();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const loginSuccess = useUserStore((s) => s.loginSuccess);
  const [tab, setTab] = useState<Tab>('phone');
  const [showPwd, setShowPwd] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const [countryCode, setCountryCode] = useState('86');
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [googleCode, setGoogleCode] = useState('');
  const [needGoogle, setNeedGoogle] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit();
  };

  const submit = async () => {
    if (!agree) return toast.error(t('authError.agreeFirst'));
    if (!password) return toast.error(t('auth.pwdPlaceholder'));

    let payload: Parameters<typeof login>[0];
    if (tab === 'phone') {
      if (!countryCode) return toast.error(t('authError.countryCodeRequired'));
      if (!phone) return toast.error(t('auth.phonePlaceholder'));
      payload = { type: 'phone', identifier: phone, countryCode, password, googleCode };
    } else {
      if (!identifier) return toast.error(t('auth.identifierPlaceholder'));
      const isEmail = identifier.includes('@');
      payload = {
        type: isEmail ? 'email' : 'account',
        identifier,
        password,
        googleCode,
      };
    }
    if (needGoogle && !googleCode) return toast.error(t('auth.googleCodePrompt'));

    setLoading(true);
    try {
      const vo = await login(payload);
      await loginSuccess(vo.token);
      toast.success(t('auth.loginSuccess'));
      nav(getSafeRedirect(redirect), { replace: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('auth.loginFailed');
      if (isGoogleCodeRequiredError(e) && !needGoogle) {
        setNeedGoogle(true);
        toast.info(t('auth.googleCodePrompt'));
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  console.log(`Login page`)

  // useEffect(() => {
  //   nav(`/auth/wallet${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`, { replace: true });
  // }, [])

  return (
    <AuthLayout title={t('auth.loginTitle')}>
      <div className="flex gap-8 border-b border-line">
        <button
          type="button"
          onClick={() => setTab('phone')}
          className={`pb-3 text-base ${tab === 'phone' ? 'border-b-2 border-text font-medium' : 'text-textSub'}`}
        >
          {t('auth.tabPhone')}
        </button>
        <button
          type="button"
          onClick={() => setTab('email_account')}
          className={`pb-3 text-base ${tab === 'email_account' ? 'border-b-2 border-text font-medium' : 'text-textSub'}`}
        >
          {t('auth.tabEmail')}
        </button>
      </div>

      <form className="mt-6 space-y-3" onSubmit={handleSubmit} noValidate>
        {tab === 'phone' ? (
          <div className="input-base flex items-center gap-2">
            <input
              name="countryCode"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ''))}
              className="w-10 bg-transparent outline-none text-textSub"
              autoComplete="tel-country-code"
            />
            <span className="text-textMute">▾</span>
            <input
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 bg-transparent outline-none"
              placeholder={t('auth.phonePlaceholder')}
              inputMode="numeric"
              autoComplete="tel"
            />
          </div>
        ) : (
          <input
            name="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="input-base"
            placeholder={t('auth.emailPlaceholder')}
            autoComplete="username"
          />
        )}

        <div className="input-base flex items-center">
          <input
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPwd ? 'text' : 'password'}
            className="flex-1 bg-transparent outline-none"
            placeholder={t('auth.pwdPlaceholder')}
            autoComplete="current-password"
          />
          <button onClick={() => setShowPwd(!showPwd)} className="text-textSub" type="button">
            {showPwd ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>

        {needGoogle && (
          <input
            name="googleCode"
            value={googleCode}
            onChange={(e) => setGoogleCode(e.target.value)}
            className="input-base"
            placeholder={t('auth.googleCode')}
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
        )}

        <div className="text-right">
          <Link to="/auth/forgot" className="text-sm font-medium">
            {t('auth.forgotPwd')}
          </Link>
        </div>

        <AuthAgreement checked={agree} onChange={setAgree} />

        <button
          type="submit"
          className="btn-primary w-full mt-2 disabled:opacity-50"
          disabled={!agree || loading}
        >
          {loading ? t('common.loading') : t('auth.login')}
        </button>
      </form>

      {/* <Link to={withRedirect('/auth/wallet', redirect)} className="btn-outline w-full inline-flex items-center justify-center mt-3">
        {t('auth.walletLogin')}
      </Link> */}

      <div className="text-center text-sm text-textSub mt-2">
        <Link to={withRedirect('/auth/register', redirect)} className="text-text font-medium">
          {t('auth.noAccount')}
        </Link>
      </div>
    </AuthLayout>
  );
}
