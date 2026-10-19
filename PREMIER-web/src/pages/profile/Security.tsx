import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { toast } from '@/components/Toast';
import {
  changeLoginPwd,
  setPayPwd,
  bindEmail,
  prepareGoogle,
  enableGoogle,
  disableGoogle,
  type GooglePrepareVO,
} from '@/api/security';
import { sendCode } from '@/api/auth';

type Modal = null | 'login_pwd' | 'pay_pwd' | 'email' | 'google';

export default function SecurityPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useUserStore((s) => s.user);
  const refresh = useUserStore((s) => s.refresh);
  const [modal, setModal] = useState<Modal>(null);

  useEffect(() => {
    if (!user) refresh();
  }, [user, refresh]);

  useEffect(() => {
    if (searchParams.get('modal') === 'pay_pwd') {
      setModal('pay_pwd');
    }
  }, [searchParams]);

  if (!user) return null;

  const Item = ({
    title,
    badge,
    desc,
    onClick,
  }: {
    title: string;
    badge?: { text: string; tone: 'red' | 'gray' };
    desc: string;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} className="mb-6 w-full rounded-xl bg-bgSoft p-5 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold">{title}</span>
          {badge && (
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                badge.tone === 'red' ? 'bg-down/10 text-down' : 'bg-bg text-textSub'
              }`}
            >
              {badge.text}
            </span>
          )}
        </div>
        <ChevronRight size={16} className="text-textSub" />
      </div>
      <div className="divider my-5" />
      <div className="text-sm font-semibold leading-6 text-text">{desc}</div>
    </button>
  );

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-0 md:max-w-[900px]">
      <div className="sticky top-0 z-30 -mx-4 mb-4 flex h-12 items-center border-b border-line bg-bg/95 px-4 backdrop-blur md:static md:mx-0 md:border-b-0 md:bg-transparent md:px-0 md:backdrop-blur-0">
        <button onClick={() => nav(-1)} className="w-9 h-9 -ml-2 flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 text-center text-xl font-bold">{t('security.title')}</div>
        <div className="w-9" />
      </div>

      <Item
        title={t('security.primaryKyc')}
        badge={user.kycLevel >= 1 ? { text: t('profile.verified'), tone: 'gray' } : { text: t('profile.unverified'), tone: 'red' }}
        desc={t('security.primaryKycDesc')}
        onClick={() => nav('/profile/kyc?level=1')}
      />
      <Item
        title={t('security.advancedKyc')}
        badge={user.kycLevel >= 2 ? { text: t('profile.verified'), tone: 'gray' } : { text: t('profile.unverified'), tone: 'red' }}
        desc={t('security.advancedKycDesc')}
        onClick={() => nav('/profile/kyc?level=2')}
      />
      <Item
        title={t('security.loginPassword')}
        desc={t('security.loginPasswordDesc')}
        onClick={() => setModal('login_pwd')}
      />
      <Item
        title={t('security.emailBind')}
        badge={user.emailBound ? { text: t('security.bound'), tone: 'gray' } : { text: t('security.unbound'), tone: 'red' }}
        desc={t('security.emailBindDesc')}
        onClick={() => setModal('email')}
      />
      <Item
        title={t('security.payPassword')}
        badge={user.payPwdSet ? { text: t('security.set'), tone: 'gray' } : { text: t('security.unset'), tone: 'red' }}
        desc={t('security.payPasswordDesc')}
        onClick={() => setModal('pay_pwd')}
      />

      {modal === 'login_pwd' && <LoginPwdModal close={() => setModal(null)} />}
      {modal === 'pay_pwd' && (
        <PayPwdModal close={() => setModal(null)} hasOld={user.payPwdSet} onDone={refresh} />
      )}
      {modal === 'email' && <EmailModal close={() => setModal(null)} onDone={refresh} />}
    </div>
  );
}

function ModalShell({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 md:items-center" onClick={close}>
      <div className="aster-bottom-sheet w-full bg-bg p-5 pb-safe md:max-w-md md:rounded-lg md:pb-5 rounded-t-lg" onClick={(e) => e.stopPropagation()}>
        <div className="text-base font-medium mb-4">{title}</div>
        {children}
      </div>
    </div>,
    document.body
  );
}

function LoginPwdModal({ close }: { close: () => void }) {
  const { t } = useTranslation();
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!oldPwd || !newPwd) return toast.error(t('security.completeRequired'));
    setLoading(true);
    try {
      await changeLoginPwd({ oldPassword: oldPwd, newPassword: newPwd });
      toast.success(t('security.changeSuccess'));
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('security.changeFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title={t('security.changeLoginPwd')} close={close}>
      <input
        className="input-base mb-3"
        type="password"
        placeholder={t('security.oldPwd')}
        value={oldPwd}
        onChange={(e) => setOldPwd(e.target.value)}
      />
      <input
        className="input-base mb-3"
        type="password"
        placeholder={t('security.newPwd')}
        value={newPwd}
        onChange={(e) => setNewPwd(e.target.value)}
      />
      <button className="btn-primary w-full" onClick={submit} disabled={loading}>
        {t('common.confirm')}
      </button>
    </ModalShell>
  );
}

function PayPwdModal({ close, hasOld, onDone }: { close: () => void; hasOld: boolean; onDone: () => void }) {
  const { t } = useTranslation();
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (hasOld && !oldPwd.trim()) return toast.error(t('security.oldPayPwd'));
    if (!newPwd || !/^\d{6}$/.test(newPwd)) return toast.error(t('security.payPwdSix'));
    setLoading(true);
    try {
      await setPayPwd({ oldPassword: oldPwd.trim() || undefined, newPassword: newPwd });
      toast.success(t('security.setSuccess'));
      onDone();
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('security.setFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title={hasOld ? t('security.changePayPwd') : t('security.setPayPwd')} close={close}>
      {!hasOld && (
        <div className="mb-3 rounded-lg bg-[#FFF7E8] px-3 py-2 text-xs leading-5 text-[#9A5A00]">
          {t('security.payPwdLoginVerifyHint')}
        </div>
      )}
      <input
        className="input-base mb-3"
        type="password"
        placeholder={hasOld ? t('security.oldPayPwd') : t('security.loginPwdVerify')}
        inputMode={hasOld ? 'numeric' : undefined}
        maxLength={hasOld ? 6 : undefined}
        autoComplete="current-password"
        value={oldPwd}
        onChange={(e) => setOldPwd(e.target.value)}
      />
      <input
        className="input-base mb-3"
        type="password"
        placeholder={t('security.newPayPwdPlaceholder')}
        inputMode="numeric"
        maxLength={6}
        autoComplete="new-password"
        value={newPwd}
        onChange={(e) => setNewPwd(e.target.value)}
      />
      <button className="btn-primary w-full" onClick={submit} disabled={loading}>
        {t('common.confirm')}
      </button>
    </ModalShell>
  );
}

function EmailModal({ close, onDone }: { close: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  const onSendCode = async () => {
    if (!email) return toast.error(t('auth.emailPlaceholder'));
    try {
      await sendCode({ targetType: 'email', target: email, scene: 'bind_email' });
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      toast.success(t('security.codeSent'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('authError.sendFailed'));
    }
  };

  const submit = async () => {
    if (!email || !code) return toast.error(t('security.completeRequired'));
    setLoading(true);
    try {
      await bindEmail({ email, code });
      toast.success(t('security.bindSuccess'));
      onDone();
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('security.bindFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title={t('security.bindEmail')} close={close}>
      <input
        className="input-base mb-3"
        type="email"
        placeholder={t('security.emailAddress')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="flex gap-3 mb-3">
        <input
          className="input-base flex-1"
          placeholder={t('authError.codeHint')}
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          onClick={onSendCode}
          disabled={countdown > 0}
          className="h-11 px-4 rounded-lg border border-line text-sm whitespace-nowrap disabled:text-textMute"
        >
          {countdown > 0 ? `${countdown}s` : t('authError.getCode')}
        </button>
      </div>
      <button className="btn-primary w-full" onClick={submit} disabled={loading}>
        {t('common.confirm')}
      </button>
    </ModalShell>
  );
}

function GoogleModal({
  close,
  enabled,
  onDone,
}: {
  close: () => void;
  enabled: boolean;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<GooglePrepareVO | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      prepareGoogle().then(setData).catch(() => toast.error(t('security.secretFailed')));
    }
  }, [enabled]);

  const submit = async () => {
    if (!code) return toast.error(t('security.codeRequired'));
    if (!enabled && !data) {
      toast.error(t('security.secretFailed'));
      return;
    }
    setLoading(true);
    try {
      if (enabled) {
        await disableGoogle({ code });
        toast.success(t('security.closed'));
      } else if (data) {
        await enableGoogle({ secret: data.secret, code });
        toast.success(t('security.enabled'));
      }
      onDone();
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('security.operationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title={enabled ? t('security.closeGoogle') : t('security.enableGoogle')} close={close}>
      {!enabled && data && (
        <div className="mb-4 text-center">
          {data.qrDataUri && (
            <img src={data.qrDataUri} alt="qr" className="mx-auto w-40 h-40 bg-bgSoft" />
          )}
          <div className="text-xs text-textSub mt-2 break-all">{t('security.secret', { secret: data.secret })}</div>
          <div className="text-xs text-textMute mt-1">{t('security.googleTip')}</div>
        </div>
      )}
      <input
        className="input-base mb-3"
        placeholder={t('authError.codeHint')}
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button className="btn-primary w-full" onClick={submit} disabled={loading}>
        {t('common.confirm')}
      </button>
    </ModalShell>
  );
}
