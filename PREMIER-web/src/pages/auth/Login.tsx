import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Eye, EyeOff, WalletCards } from 'lucide-react';
import AuthLayout from './AuthLayout';
import AuthAgreement from './AuthAgreement';
import { useAuthPageTranslation } from './authI18n';
import { login } from '@/api/auth';
import { ApiError } from '@/api/http';
import { useUserStore } from '@/store/userStore';
import { toast } from '@/components/Toast';
import { getSafeRedirect, withRedirect } from './authRedirect';
import CountryCodeModal from '@/components/CountryCodeModal';
import { findCountryByCode } from '@/data/countryCodes';

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
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const currentCountry = useMemo(() => findCountryByCode(countryCode), [countryCode]);
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

  return (
    <AuthLayout title={t('auth.loginTitle')}>
      {/* 登录方式切换标签 */}
      <div className="flex gap-8 border-b border-line">
        <button
          type="button"
          onClick={() => setTab('phone')}
          className={`pb-3 text-base transition ${
            tab === 'phone' ? 'border-b-2 border-primary font-semibold text-primary' : 'text-textSub hover:text-text'
          }`}
        >
          {t('auth.tabPhone')}
        </button>
        <button
          type="button"
          onClick={() => setTab('email_account')}
          className={`pb-3 text-base transition ${
            tab === 'email_account' ? 'border-b-2 border-primary font-semibold text-primary' : 'text-textSub hover:text-text'
          }`}
        >
          {t('auth.tabEmail')}
        </button>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        {tab === 'phone' ? (
          <div className="input-base flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCountryPickerOpen(true)}
              className="flex items-center gap-1.5 py-1 text-slate-800 font-bold hover:text-cyan-600 transition cursor-pointer select-none shrink-0"
              title={t('auth.selectCountry', '选择国家或地区')}
            >
              <span className="text-base leading-none select-none">{currentCountry?.flag || '🌐'}</span>
              <span className="text-sm font-bold num tabular-nums text-slate-900 leading-none">+{countryCode}</span>
              <ChevronDown size={14} className="text-slate-400 hover:text-cyan-600 transition" />
            </button>
            <div className="h-4 w-px bg-slate-200 shrink-0" />
            <input
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-text placeholder:text-textMute"
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
            placeholder={t('auth.identifierPlaceholder')}
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
          <button onClick={() => setShowPwd(!showPwd)} className="text-textSub hover:text-text transition p-1" type="button">
            {showPwd ? <Eye size={18} /> : <EyeOff size={18} />}
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

        <div className="flex items-center justify-end">
          <Link to="/auth/forgot" className="text-sm font-medium text-textSub hover:text-primary transition">
            {t('auth.forgotPwd')}
          </Link>
        </div>

        <AuthAgreement checked={agree} onChange={setAgree} />

        <button
          type="submit"
          className="btn-primary w-full mt-2 h-11 text-base font-semibold shadow-md disabled:opacity-50"
          disabled={!agree || loading}
        >
          {loading ? t('common.loading') : t('auth.login')}
        </button>
      </form>

      {/* Web3 钱包快捷登录入口 */}
      <Link
        to={withRedirect('/auth/wallet', redirect)}
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-bgSoft/70 text-sm font-semibold text-text hover:bg-bgSoft hover:border-primary/40 transition"
      >
        <WalletCards size={18} className="text-primary" />
        {t('auth.walletLogin')}
      </Link>

      {/* 注册新账号引导 */}
      <div className="mt-6 text-center text-sm text-textSub">
        <span>{t('auth.noAccount')}</span>{' '}
        <Link to={withRedirect('/auth/register', redirect)} className="font-semibold text-primary hover:underline ml-1">
          {t('auth.register')}
        </Link>
      </div>

      <CountryCodeModal
        open={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        value={countryCode}
        onSelect={(item) => setCountryCode(item.code)}
      />
    </AuthLayout>
  );
}
