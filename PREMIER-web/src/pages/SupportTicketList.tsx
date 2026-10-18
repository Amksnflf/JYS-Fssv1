import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { PcContainer } from '@/components/pc';
import { fetchMySupportTickets, type SupportTicket } from '@/api/support';
import { useResponsive } from '@/hooks/useResponsive';

const STATUS_OPTIONS = [-1, 0, 1, 2, 3, 4] as const;

function statusText(status: number, t: (key: string) => string) {
  return t(`supportTicket.status${status}`);
}

function priorityText(priority: number, t: (key: string) => string) {
  return t(`supportTicket.priority${priority}`);
}

function formatTime(value?: string | null) {
  if (!value) return '--';
  return value.replace('T', ' ').slice(0, 16);
}

export default function SupportTicketListPage() {
  const { t } = useTranslation();
  const { isPc } = useResponsive();
  const [status, setStatus] = useState<number>(-1);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMySupportTickets({ pageNo: 1, pageSize: 50, status: status >= 0 ? status : undefined })
      .then((data) => {
        if (!cancelled) setTickets(data?.records ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const list = useMemo(() => {
    if (loading) {
      return <div className="py-10 text-center text-[13px] text-textSub">{t('common.loading')}</div>;
    }
    if (tickets.length === 0) {
      return <div className="py-10 text-center text-[13px] text-textSub">{t('supportTicket.empty')}</div>;
    }
    return (
      <div className="space-y-3">
        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            to={`/support/ticket/${ticket.id}`}
            className="block rounded-2xl border border-line bg-bg px-4 py-4 shadow-card transition hover:border-text/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="line-clamp-1 text-[15px] font-semibold text-text">{ticket.subject}</div>
                <div className="mt-2 text-[12px] text-textSub">{ticket.ticketNo}</div>
              </div>
              <span className="shrink-0 rounded-full bg-bgSoft px-3 py-1 text-[12px] text-text">
                {statusText(ticket.status, t)}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[12px] text-textSub">
              <span className="rounded-full bg-bgSoft px-3 py-1">{ticket.category}</span>
              <span className="rounded-full bg-bgSoft px-3 py-1">{priorityText(ticket.priority, t)}</span>
              <span className="rounded-full bg-bgSoft px-3 py-1">{formatTime(ticket.lastReplyAt || ticket.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    );
  }, [loading, t, tickets]);

  const content = (
    <>
      <div className="mb-5 flex gap-2 overflow-x-auto scrollbar-none">
        {STATUS_OPTIONS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStatus(item)}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] ${
              status === item ? 'bg-text text-bg' : 'bg-bgSoft text-textSub'
            }`}
          >
            {item === -1 ? t('supportTicket.allStatus') : statusText(item, t)}
          </button>
        ))}
      </div>
      {list}
    </>
  );

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          <div className="mx-auto max-w-[900px]">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="pc-h2 m-0">{t('supportTicket.myTitle')}</h1>
                <p className="mt-3 text-[14px] text-textSubPc">{t('supportTicket.mySubtitle')}</p>
              </div>
              <Link to="/support/ticket/new" className="pc-btn-primary">
                {t('supportTicket.createTitle')}
              </Link>
            </div>
            <div className="mt-8">{content}</div>
          </div>
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-12 md:bg-[#3c3c3c] md:py-6">
      <div className="mx-auto min-h-screen w-full max-w-md bg-bg">
        <PageHeader
          title={t('supportTicket.myTitle')}
          fallbackPath="/support-hub"
          right={<Link to="/support/ticket/new" className="text-[12px] text-text">{t('supportTicket.createTitle')}</Link>}
        />
        <div className="px-4 pb-8 pt-5">{content}</div>
      </div>
    </div>
  );
}
