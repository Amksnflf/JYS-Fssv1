import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronLeft, HelpCircle, Info as InfoIcon, Square, X } from 'lucide-react';
import { fetchOverview, type AssetOverview } from '@/api/asset';
import {
  borrowLoan,
  fetchLoanProducts,
  fetchMyLoanOrders,
  repayLoan,
  type LoanOrderVO,
  type LoanProduct,
} from '@/api/finance';
import { AsterSelect, BottomSheet, CoinLogo } from '@/components/AsterUI';
import { toast } from '@/components/Toast';

const TERMS = [1, 5, 7, 10, 15, 30];

type InfoSheetType = 'guide' | 'rate' | 'agreement' | null;

export default function LoanDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const nav = useNavigate();
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [productId, setProductId] = useState<number | null>(null);
  const [overview, setOverview] = useState<AssetOverview | null>(null);
  const [orders, setOrders] = useState<LoanOrderVO[]>([]);
  const [tab, setTab] = useState<'borrow' | 'orders'>('borrow');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [days, setDays] = useState(1);
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [infoSheet, setInfoSheet] = useState<InfoSheetType>(null);

  useEffect(() => {
    fetchLoanProducts()
      .then((rows) => {
        const list = rows ?? [];
        setProducts(list);
        const byRoute = list.find((item) => String(item.id) === id);
        setProductId((byRoute ?? list[0])?.id ?? null);
      })
      .catch(() => setProducts([]));
    fetchOverview().then(setOverview).catch(() => {});
    loadOrders();
  }, [id]);

  const product = useMemo(
    () => products.find((item) => item.id === productId) ?? products[0] ?? null,
    [products, productId]
  );

  const usdtAvailable = useMemo(() => {
    return overview?.accounts.find((item) => item.accountType === 1 && item.coin === 'USDT')?.available ?? '0';
  }, [overview]);

  const borrowedSummary = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        if (order.status !== 1) return acc;
        if (order.coin === 'USDT') {
          acc.borrowed += Number(order.borrowAmount || 0);
          acc.repay += Number(order.repayAmount ?? order.borrowAmount ?? 0);
        }
        return acc;
      },
      { borrowed: 0, repay: 0 }
    );
  }, [orders]);

  const borrowAmount = useMemo(() => {
    if (!product) return 0;
    return Number(collateralAmount || 0) * Number(product.collateralRatio || 0);
  }, [collateralAmount, product]);

  const interest = useMemo(() => {
    if (!product) return 0;
    return borrowAmount * Number(product.dailyRate || 0) * days;
  }, [borrowAmount, days, product]);

  const serviceFee = borrowAmount * 0.001;
  const estimatedRepay = borrowAmount + interest;
  const dailyRatePercent = product ? (Number(product.dailyRate) * 100).toFixed(2) : '0.00';

  const loadOrders = () => {
    fetchMyLoanOrders(undefined, 1, 30).then((page) => setOrders(page?.records ?? [])).catch(() => setOrders([]));
  };

  const submit = async () => {
    if (!product) return;
    if (!agreed) {
      toast.error(t('finance.readLoanAgreement'));
      return;
    }
    if (!collateralAmount || Number(collateralAmount) <= 0 || borrowAmount <= 0) {
      toast.error(t('finance.collateralRequired'));
      return;
    }
    setLoading(true);
    try {
      await borrowLoan(product.id, borrowAmount.toFixed(8), days);
      toast.success(t('finance.borrowSuccess'));
      setCollateralAmount('');
      await Promise.allSettled([
        fetchOverview().then(setOverview),
        fetchMyLoanOrders(undefined, 1, 30).then((page) => setOrders(page?.records ?? [])),
      ]);
      setTab('orders');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('finance.borrowFailed'));
    } finally {
      setLoading(false);
    }
  };

  const repay = async (order: LoanOrderVO) => {
    if (!window.confirm(t('finance.confirmRepay'))) return;
    try {
      await repayLoan(order.id);
      toast.success(t('finance.repaySuccess'));
      loadOrders();
      fetchOverview().then(setOverview).catch(() => {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('finance.repayFailed'));
    }
  };

  if (!product) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-bg">
        <Header onBack={() => nav('/discover')} onHelp={() => setInfoSheet('guide')} />
        <p className="pt-10 text-center text-sm text-textSub">{t('finance.loanLoading')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg pb-24">
      <Header onBack={() => nav('/discover')} onHelp={() => setInfoSheet('guide')} />

      <main className="px-4 pt-4">
        <section className="rounded-xl bg-bg p-5 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <div className="grid grid-cols-2">
            <Summary label={t('finance.borrowedAmount')} value={borrowedSummary.borrowed} />
            <Summary label={t('finance.remainingRepay')} value={borrowedSummary.repay} />
          </div>
        </section>

        <div className="mt-7 grid grid-cols-2 border-b border-line text-base">
          <TabButton active={tab === 'borrow'} onClick={() => setTab('borrow')}>
            {t('finance.pledgeBorrow')}
          </TabButton>
          <TabButton active={tab === 'orders'} onClick={() => setTab('orders')}>
            {t('finance.activeLoanOrders')}
          </TabButton>
        </div>

        {tab === 'borrow' ? (
          <>
            <SectionTitle>{t('finance.collateralAmount')}</SectionTitle>
            <div className="mt-3 flex gap-3">
              <div className="flex h-[58px] min-w-0 flex-1 items-center rounded-lg border border-line px-4">
                <input
                  value={collateralAmount}
                  onChange={(e) => setCollateralAmount(e.target.value)}
                  placeholder={t('finance.enterPlaceholder')}
                  inputMode="decimal"
                  className="num min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-textSub"
                />
                <button
                  type="button"
                  onClick={() => setCollateralAmount(usdtAvailable)}
                  className="rounded-md bg-text px-3 py-2 text-sm text-bg"
                >
                  MAX
                </button>
              </div>
              <CoinSelect product={product} products={products} onChange={setProductId} />
            </div>
            <div className="mt-3 text-[13px] text-textSub">
              {t('finance.collateralAvailable')}: {Number(usdtAvailable).toFixed(0)} USDT
            </div>

            <SectionTitle>{t('finance.borrowableAmount')}</SectionTitle>
            <div className="mt-3 flex h-[58px] items-center rounded-lg border border-line px-4">
              <span className="num flex-1 text-[15px]">{borrowAmount.toFixed(2)}</span>
              <span className="text-[15px] text-[#2F7D32]">{product.coin === 'USDT' ? 'T' : product.coin}</span>
            </div>
            <p className="mt-3 px-4 text-[13px] leading-6 text-textSub">{t('finance.loanDesc')}</p>

            <SectionTitle>{t('finance.loanTerm')}</SectionTitle>
            <div className="mt-5 grid grid-cols-3 gap-y-6">
              {TERMS.map((term) => (
                <button
                  key={term}
                  type="button"
                  disabled={term > product.maxDays}
                  onClick={() => setDays(term)}
                  className={`mx-auto h-11 w-[112px] rounded-full text-base disabled:opacity-30 ${
                    days === term ? 'bg-text text-bg' : 'bg-bg text-text'
                  }`}
                >
                  {term}
                  {t('finance.days')}
                </button>
              ))}
            </div>

            <section className="mt-10 rounded-lg bg-bgSoft px-5 py-5 text-sm">
              <FeeRow
                label={t('finance.dailyInterestRate')}
                hint
                value={`${dailyRatePercent}%`}
                onHintClick={() => setInfoSheet('rate')}
              />
              <FeeRow label={t('finance.totalInterest')} value={`${interest.toFixed(2)} ${product.coin}`} />
              <FeeRow label={t('finance.totalServiceFee')} value={`${serviceFee.toFixed(0)} ${product.coin}`} />
              <div className="my-4 h-px bg-line" />
              <FeeRow label={t('finance.estimatedRepay')} value={`${estimatedRepay.toFixed(2)} ${product.coin}`} />
            </section>

            <div
              role="button"
              tabIndex={0}
              onClick={() => setAgreed((value) => !value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setAgreed((value) => !value);
                }
              }}
              className="mt-5 flex cursor-pointer items-center gap-3 text-sm"
            >
              <span
                className={`flex h-4 w-4 items-center justify-center border ${
                  agreed ? 'border-text bg-text text-bg' : 'border-textSub'
                }`}
              >
                {agreed ? <Check size={12} /> : null}
              </span>
              <span className="flex flex-wrap items-center text-left">
                {t('finance.agreeLoanPrefix')}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setInfoSheet('agreement');
                  }}
                  className="mx-0.5 text-[#2F7D32] underline underline-offset-2"
                >
                  {t('finance.loanAgreement')}
                </button>
                {t('finance.agreeLoanSuffix')}
              </span>
            </div>
          </>
        ) : (
          <section className="mt-5 space-y-3">
            {orders.filter((order) => order.status === 1).length === 0 ? (
              <div className="py-16 text-center text-sm text-textSub">{t('finance.noActiveLoanOrders')}</div>
            ) : (
              orders
                .filter((order) => order.status === 1)
                .map((order) => (
                  <article key={order.id} className="rounded-xl border border-line p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">
                        DeFi{t('finance.tab.loan')} · {order.coin}
                      </div>
                      <span className="rounded bg-bgSoft px-2 py-1 text-xs text-textSub">{t('finance.activeLoan')}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-y-2">
                      <OrderRow
                        label={t('finance.borrowAmount')}
                        value={`${Number(order.borrowAmount).toFixed(4)} ${order.coin}`}
                      />
                      <OrderRow
                        label={t('finance.collateralAmountLabel')}
                        value={`${Number(order.collateralAmount).toFixed(2)} USDT`}
                      />
                      <OrderRow
                        label={t('finance.interestFee')}
                        value={`${Number(order.liveInterest ?? order.totalInterest).toFixed(6)} ${order.coin}`}
                      />
                      <OrderRow label={t('finance.term')} value={`${order.lockDays}${t('finance.days')}`} />
                    </div>
                    <button
                      type="button"
                      onClick={() => repay(order)}
                      className="mt-4 h-10 w-full rounded-full bg-text text-sm text-bg"
                    >
                      {t('finance.repayNow')}
                    </button>
                  </article>
                ))
            )}
          </section>
        )}
      </main>

      {tab === 'borrow' && (
        <footer className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-line bg-bg px-4 pb-safe pt-4">
          <button disabled={loading} onClick={submit} className="btn-primary w-full disabled:opacity-60">
            {t('finance.borrowNow')}
          </button>
        </footer>
      )}

      <LoanInfoSheet open={infoSheet === 'guide'} title={t('finance.loanGuideTitle')} onClose={() => setInfoSheet(null)}>
        <ul className="space-y-3 text-sm leading-6 text-textSub">
          <li>{t('finance.loanGuideItem1')}</li>
          <li>{t('finance.loanGuideItem2')}</li>
          <li>{t('finance.loanGuideItem3')}</li>
          <li>{t('finance.loanGuideItem4')}</li>
        </ul>
      </LoanInfoSheet>

      <LoanInfoSheet open={infoSheet === 'rate'} title={t('finance.loanRateTitle')} onClose={() => setInfoSheet(null)}>
        <div className="space-y-3 text-sm leading-6 text-textSub">
          <p>{t('finance.loanRateDesc1', { rate: dailyRatePercent })}</p>
          <p>{t('finance.loanRateDesc2')}</p>
          <p>{t('finance.loanRateDesc3', { coin: product.coin, days: product.maxDays })}</p>
        </div>
      </LoanInfoSheet>

      <LoanInfoSheet open={infoSheet === 'agreement'} title={t('finance.loanAgreement')} onClose={() => setInfoSheet(null)}>
        <div className="space-y-3 text-sm leading-6 text-textSub">
          <p>{t('finance.loanAgreementItem1')}</p>
          <p>{t('finance.loanAgreementItem2')}</p>
          <p>{t('finance.loanAgreementItem3')}</p>
          <p>{t('finance.loanAgreementItem4')}</p>
          <p>{t('finance.loanAgreementItem5')}</p>
        </div>
      </LoanInfoSheet>
    </div>
  );
}

function Header({ onBack, onHelp }: { onBack: () => void; onHelp: () => void }) {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur">
      <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-start" aria-label="back">
        <ChevronLeft size={25} />
      </button>
      <div className="text-[17px] font-bold">DeFi{t('finance.tab.loan')}</div>
      <button type="button" onClick={onHelp} className="flex h-10 w-10 items-center justify-end text-textSub" aria-label="help">
        <InfoIcon size={22} />
      </button>
    </header>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[13px] text-textSub">{label}</div>
      <div className="num mt-3 text-[2rem] font-medium">{value.toFixed(2)}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`relative h-12 ${active ? 'font-semibold text-text' : 'text-textSub'}`}>
      {children}
      {active && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-text" />}
    </button>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex items-center gap-2 text-[17px] font-bold">
      <Square size={10} className="fill-text text-text" />
      {children}
    </div>
  );
}

function CoinSelect({
  product,
  products,
  onChange,
}: {
  product: LoanProduct;
  products: LoanProduct[];
  onChange: (id: number) => void;
}) {
  return (
    <AsterSelect
      value={product.id}
      onChange={(value) => onChange(Number(value))}
      options={products.map((item) => ({ value: item.id, label: item.coin }))}
      className="w-[118px] shrink-0"
      triggerClassName="h-[58px] rounded-2xl border border-line bg-bg px-3"
      renderValue={(selected) => (
        <span className="flex items-center justify-center gap-2">
          <CoinLogo coin={product.coin} size={28} />
          <span className="text-sm font-semibold">{selected?.label ?? product.coin}</span>
        </span>
      )}
    />
  );
}

function FeeRow({
  label,
  value,
  hint = false,
  onHintClick,
}: {
  label: string;
  value: string;
  hint?: boolean;
  onHintClick?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between last:mb-0">
      <span className="flex items-center gap-1 font-semibold">
        {label}
        {hint ? (
          <button
            type="button"
            onClick={onHintClick}
            className="inline-flex items-center justify-center text-[#2F7D32]"
            aria-label={`${label} hint`}
          >
            <HelpCircle size={14} />
          </button>
        ) : null}
      </span>
      <span className="num font-semibold">{value}</span>
    </div>
  );
}

function OrderRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-textSub">{label}</span>
      <span className="num text-right">{value}</span>
    </>
  );
}

function LoanInfoSheet({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} className="overflow-hidden">
      <div className="px-4 pb-6 pt-3">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="text-base font-semibold text-text">{title}</div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center text-textSub" aria-label="close">
            <X size={18} />
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </BottomSheet>
  );
}
