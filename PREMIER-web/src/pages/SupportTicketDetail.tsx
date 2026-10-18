import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { PcContainer } from '@/components/pc';
import { toast } from '@/components/Toast';
import { closeSupportTicket, fetchSupportTicketDetail, replySupportTicket, type SupportTicketDetail } from '@/api/support';
import { useResponsive } from '@/hooks/useResponsive';

function formatTime(value?: string | null) {
  if (!value) return '--';
  return value.replace('T', ' ').slice(0, 16);
}

function senderLabel(senderType: number, t: (key: string) => string) {
  if (senderType === 1) return t('supportTicket.senderUser');
  if (senderType === 2) return t('supportTicket.senderAdmin');
  return t('supportTicket.senderSystem');
}

export default function SupportTicketDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { isPc } = useResponsive();
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reply, setReply] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setLoading(true);
    fetchSupportTicketDetail(id)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleReply = async () => {
    if (!id || !reply.trim()) {
      toast.info(t('supportTicket.replyRequired'));
      return;
    }
    setSending(true);
    try {
      await replySupportTicket(id, { content: reply.trim(), messageType: 'text' });
      const next = await fetchSupportTicketDetail(id);
      setDetail(next);
      setReply('');
      toast.success(t('supportTicket.replySuccess'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('supportTicket.replyFailed');
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!id) return;
    setClosing(true);
    try {
      await closeSupportTicket(id);
      const next = await fetchSupportTicketDetail(id);
      setDetail(next);
      toast.success(t('supportTicket.closeSuccess'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('supportTicket.closeFailed');
      toast.error(message);
    } finally {
      setClosing(false);
    }
  };

  const content = useMemo(() => {
    if (loading) {
      return <div className="py-10 text-center text-[13px] text-textSub">{t('common.loading')}</div>;
    }
    if (!detail) {
      return <div className="py-10 text-center text-[13px] text-textSub">{t('common.noData')}</div>;
    }
    const ticket = detail.ticket;
    const canReply = ticket.status !== 4;
    return (
      <>
        <section className="rounded-2xl border border-line bg-bg px-4 py-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[18px] font-semibold text-text">{ticket.subject}</div>
              <div className="mt-2 text-[12px] text-textSub">{ticket.ticketNo}</div>
            </div>
            <span className="shrink-0 rounded-full bg-bgSoft px-3 py-1 text-[12px]">
              {t(`supportTicket.status${ticket.status}`)}
            </span>
          </div>
          <div className="mt-4 grid gap-3 text-[13px] text-textSub md:grid-cols-2">
            <div>{t('supportTicket.category')}: {ticket.category}</div>
            <div>{t('supportTicket.priority')}: {t(`supportTicket.priority${ticket.priority}`)}</div>
            <div>{t('supportTicket.createdAt')}: {formatTime(ticket.createdAt)}</div>
            <div>{t('supportTicket.updatedAt')}: {formatTime(ticket.lastReplyAt || ticket.updatedAt)}</div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-line bg-bg px-4 py-4 shadow-card">
          <div className="text-[15px] font-semibold">{t('supportTicket.conversation')}</div>
          <div className="mt-4 space-y-3">
            {detail.messages.map((message) => (
              <div key={message.id} className="rounded-2xl bg-bgSoft px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[13px] font-semibold text-text">{senderLabel(message.senderType, t)}</div>
                  <div className="text-[12px] text-textSub">{formatTime(message.createdAt)}</div>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-text">
                  {message.content || t('supportTicket.systemMessage')}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-line bg-bg px-4 py-4 shadow-card">
          <div className="text-[15px] font-semibold">{t('supportTicket.replyTitle')}</div>
          <textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            disabled={!canReply}
            placeholder={canReply ? t('supportTicket.replyPlaceholder') : t('supportTicket.closedTip')}
            className="mt-3 min-h-[140px] w-full rounded-2xl border border-line bg-bg px-4 py-4 text-sm text-text outline-none focus:border-text focus:ring-2 focus:ring-text/10"
          />
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={handleReply} disabled={!canReply || sending} className="btn-primary flex-1">
              {sending ? t('common.loading') : t('supportTicket.replyNow')}
            </button>
            <button type="button" onClick={handleClose} disabled={!canReply || closing} className="btn-outline flex-1">
              {closing ? t('common.loading') : t('supportTicket.closeTicket')}
            </button>
          </div>
        </section>
      </>
    );
  }, [closing, detail, loading, reply, sending, t]);

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          <div className="mx-auto max-w-[900px]">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="pc-h2 m-0">{t('supportTicket.detailTitle')}</h1>
                <p className="mt-3 text-[14px] text-textSubPc">{t('supportTicket.detailSubtitle')}</p>
              </div>
              <Link to="/support/ticket" className="pc-btn-ghost">
                {t('supportTicket.myTitle')}
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
          title={t('supportTicket.detailTitle')}
          fallbackPath="/support/ticket"
          right={<Link to="/support/ticket" className="text-[12px] text-text">{t('supportTicket.myTitle')}</Link>}
        />
        <div className="px-4 pb-8 pt-5">{content}</div>
      </div>
    </div>
  );
}
