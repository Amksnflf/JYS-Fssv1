import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ShieldCheck,
  UserCheck,
  Activity,
  Smartphone,
  Zap,
  TrendingUp,
  Headphones,
  Lock,
  RefreshCw,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { toast } from '@/components/Toast';

export default function CreditScorePage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [checking, setChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState('今日 实时监测中');

  const handleRecheck = () => {
    if (checking) return;
    setChecking(true);
    toast.info('正在进行多维度安全健康体检…');
    setTimeout(() => {
      setChecking(false);
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      setLastCheckTime(`刚刚 ${timeStr} 已更新`);
      toast.success('安全体检完成：各项防护指标均为最佳，信用分维持 100 满分！');
    }, 1200);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50/70 pb-20 text-slate-900">
      {/* 顶栏 */}
      <header className="sticky top-0 z-30 flex h-13 items-center justify-between border-b border-slate-100 bg-white/95 px-4 backdrop-blur-md">
        <button
          onClick={() => nav(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition active:scale-95 hover:bg-slate-200 cursor-pointer"
          aria-label="back"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-[16px] font-black tracking-tight text-slate-900">
          {t('credit.title', '信用安全分')}
        </div>
        <button
          onClick={() => toast.info('CoinEx 7×24小时安全风控中心全天候保护您的资产')}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition cursor-pointer"
          aria-label="support"
          title="安全中心说明"
        >
          <Info size={19} />
        </button>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* 1. 核心安全雷达 / 极光仪表盘卡片 */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#09182B] via-[#0D233A] to-[#0A1B2E] p-6 text-white shadow-xl shadow-cyan-950/20 border border-cyan-500/20">
          {/* 极光背景发光光晕 */}
          <div className="pointer-events-none absolute -top-12 -left-12 h-44 w-44 rounded-full bg-[#00C4DF]/25 blur-3xl" />
          <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-[#00B578]/25 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center">
            {/* SVG 260度渐变圆弧仪表盘 */}
            <div className="relative flex h-[190px] w-[220px] items-center justify-center">
              <svg width="220" height="190" viewBox="0 0 220 190" className="overflow-visible">
                <defs>
                  <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00C4DF" />
                    <stop offset="60%" stopColor="#00E5A3" />
                    <stop offset="100%" stopColor="#00B578" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* 背景刻度灰色圆弧 (240度) */}
                <path
                  d="M 35 155 A 85 85 0 1 1 185 155"
                  fill="none"
                  stroke="#1E324D"
                  strokeWidth="12"
                  strokeLinecap="round"
                />

                {/* 前景满分发光弧线 */}
                <path
                  d="M 35 155 A 85 85 0 1 1 185 155"
                  fill="none"
                  stroke="url(#gaugeGrad)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="420"
                  strokeDashoffset="0"
                  filter="url(#glow)"
                />

                {/* 刻度小点标线 */}
                <circle cx="35" cy="155" r="3" fill="#00C4DF" />
                <circle cx="110" cy="25" r="3" fill="#00E5A3" />
                <circle cx="185" cy="155" r="3" fill="#00B578" />
              </svg>

              {/* 仪表盘中心内容 */}
              <div className="absolute top-[38px] flex flex-col items-center">
                <span className="text-[12px] font-semibold text-cyan-200/80 tracking-wider">
                  {t('credit.myScore', '我的信用分')}
                </span>
                <span className="num mt-1 text-[52px] font-black leading-none tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,196,223,0.6)]">
                  100
                </span>
                <div className="mt-1 flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 border border-emerald-400/30">
                  <ShieldCheck size={13} className="text-emerald-400" />
                  <span className="text-[11px] font-bold text-emerald-300">AAA 顶级信用</span>
                </div>
              </div>
            </div>

            {/* 安全健康状态胶囊 */}
            <div className="mt-2 text-center">
              <h2 className="text-[17px] font-black tracking-tight text-white flex items-center justify-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#00B578] shadow-[0_0_8px_#00B578]" />
                <span>{t('credit.verySafe', '您的账户非常安全')}</span>
              </h2>
              <p className="mt-1 text-xs text-slate-300">
                已超越平台 99.8% 的用户，全套防护措施运行中
              </p>
            </div>

            {/* 实时更新标签 */}
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] text-cyan-200/90 backdrop-blur-sm border border-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>{lastCheckTime}</span>
            </div>
          </div>
        </section>

        {/* 2. 100分尊享信用特权 (高信用专属特权展板) */}
        <section className="rounded-3xl bg-white p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 font-bold">
                💎
              </span>
              <span className="text-[14px] font-extrabold text-slate-900">尊享信用特权 (4项已激活)</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              全额保障
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100/80 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-cyan-600 font-bold">
                <Zap size={15} />
                <span>提币极速通道</span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                大额提币免人工审核，系统秒级自动广播出账
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100/80 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <TrendingUp size={15} />
                <span>免风控额度加成</span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                现货与合约日累计额度提升至顶级交易所最高档
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100/80 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-blue-600 font-bold">
                <Headphones size={15} />
                <span>VIP 专属响应</span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                1对1 安全专员服务通道，优先解决交易异常
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100/80 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-purple-600 font-bold">
                <Lock size={15} />
                <span>安全基金赔付</span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                纳入 CoinEx 100% 储备金计划，财产高枕无忧
              </p>
            </div>
          </div>
        </section>

        {/* 3. 四维安全评估深度明细 */}
        <section className="rounded-3xl bg-white p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold">
                🛡️
              </span>
              <span className="text-[14px] font-extrabold text-slate-900">信用安全评估构成</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400">总分 100</span>
          </div>

          <div className="mt-3 space-y-2.5">
            {/* 项目 1 */}
            <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100/80">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100/70 text-emerald-600">
                  <UserCheck size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">高级实名身份认证 (KYC)</span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600">+30分</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">已通过人脸生物特征与权威证件核验</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 size={15} />
                <span>已达标</span>
              </div>
            </div>

            {/* 项目 2 */}
            <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100/80">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100/70 text-cyan-600">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">双重身份保护 (2FA)</span>
                    <span className="rounded bg-cyan-50 px-1.5 py-0.2 text-[10px] font-bold text-cyan-600">+25分</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">谷歌验证器与绑定邮箱双重阻截保护</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 size={15} />
                <span>已达标</span>
              </div>
            </div>

            {/* 项目 3 */}
            <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100/80">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100/70 text-blue-600">
                  <Activity size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">交易合规与履约记录</span>
                    <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[10px] font-bold text-blue-600">+25分</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">交易履约率 100%，无违规操作与涉案风险</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 size={15} />
                <span>已达标</span>
              </div>
            </div>

            {/* 项目 4 */}
            <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 border border-slate-100/80">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100/70 text-purple-600">
                  <Smartphone size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">受信任常用设备保护</span>
                    <span className="rounded bg-purple-50 px-1.5 py-0.2 text-[10px] font-bold text-purple-600">+20分</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">常用设备环境安全指纹通过检测</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 size={15} />
                <span>已达标</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. 信用安全分阶梯图谱说明 */}
        <section className="rounded-3xl bg-white p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-[14px] font-extrabold text-slate-900">分级规则与健康光谱</span>
            <span className="text-[11px] text-slate-400 font-medium">官方评级标准</span>
          </div>

          <div className="mt-3 space-y-3 text-xs">
            {/* 90-100 */}
            <div className="rounded-2xl bg-emerald-50/60 p-3 border border-emerald-100/70">
              <div className="flex items-center justify-between font-bold text-emerald-700">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>90 ~ 100 分 · 非常安全 (当前级别)</span>
                </div>
                <span className="text-[11px] bg-emerald-200/60 px-2 py-0.5 rounded-full">极高信用</span>
              </div>
              <p className="mt-1.5 text-[11px] text-emerald-800/80 leading-relaxed">
                账户享有全平台顶级防护机制，享受大额提现免人工二次审核、秒级到账特权。
              </p>
            </div>

            {/* 60-89 */}
            <div className="rounded-2xl bg-amber-50/60 p-3 border border-amber-100/70">
              <div className="flex items-center justify-between font-bold text-amber-700">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>60 ~ 89 分 · 存在安全风险</span>
                </div>
                <span className="text-[11px] bg-amber-200/60 px-2 py-0.5 rounded-full">中度预警</span>
              </div>
              <p className="mt-1.5 text-[11px] text-amber-800/80 leading-relaxed">
                账户可能未绑定双重验证或处于非常用设备登录，建议及时前往安全中心完善配置。
              </p>
            </div>

            {/* <60 */}
            <div className="rounded-2xl bg-rose-50/60 p-3 border border-rose-100/70">
              <div className="flex items-center justify-between font-bold text-rose-700">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>低于 60 分 · 高危限制操作</span>
                </div>
                <span className="text-[11px] bg-rose-200/60 px-2 py-0.5 rounded-full">风控拦截</span>
              </div>
              <p className="mt-1.5 text-[11px] text-rose-800/80 leading-relaxed">
                账户已触发系统风控防护，提现及部分交易可能被暂时阻截，请联系官方客服申请核验解除。
              </p>
            </div>
          </div>
        </section>

        {/* 5. 底部一键安全体检按钮 */}
        <section className="pt-2">
          <button
            onClick={handleRecheck}
            disabled={checking}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00C4DF] to-[#00B578] text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
            <span>{checking ? '全面安全扫描中…' : '重新体检并刷新评分'}</span>
          </button>
        </section>
      </main>
    </div>
  );
}
