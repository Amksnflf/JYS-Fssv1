import { useMemo, useState } from 'react';
import { App, Button, Descriptions, Drawer, Form, Input, InputNumber, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import http from '@/api/http';
import { usePage } from '@/utils/usePage';
import { useAdminStore } from '@/store/adminStore';
import { hasPermission } from '@/utils/permission';
import type { SupportTicket, SupportTicketDetail, SupportTicketMessage } from './types';

const STATUS_OPTIONS = [
  { value: 0, label: '待接单' },
  { value: 1, label: '待用户' },
  { value: 2, label: '处理中' },
  { value: 3, label: '已解决' },
  { value: 4, label: '已关闭' },
];

const PRIORITY_OPTIONS = [
  { value: 1, label: '低' },
  { value: 2, label: '普通' },
  { value: 3, label: '高' },
  { value: 4, label: '紧急' },
];

const CATEGORY_OPTIONS = [
  { value: 'account', label: '账户问题' },
  { value: 'security', label: '安全与风控' },
  { value: 'deposit', label: '充值问题' },
  { value: 'withdraw', label: '提现问题' },
  { value: 'kyc', label: '认证问题' },
  { value: 'trade', label: '交易问题' },
  { value: 'product', label: '产品与活动' },
  { value: 'other', label: '其他问题' },
];

function formatTime(value?: string | null) {
  if (!value) return '--';
  return value.replace('T', ' ').slice(0, 19);
}

function statusTag(status?: number) {
  const current = STATUS_OPTIONS.find((item) => item.value === status);
  const color = status === 4 ? 'default' : status === 3 ? 'green' : status === 2 ? 'blue' : status === 1 ? 'gold' : 'orange';
  return <Tag color={color}>{current?.label ?? status ?? '--'}</Tag>;
}

function priorityTag(priority?: number) {
  const current = PRIORITY_OPTIONS.find((item) => item.value === priority);
  const color = priority === 4 ? 'red' : priority === 3 ? 'volcano' : priority === 2 ? 'blue' : 'default';
  return <Tag color={color}>{current?.label ?? priority ?? '--'}</Tag>;
}

function senderLabel(senderType?: number) {
  if (senderType === 1) return '用户';
  if (senderType === 2) return '客服';
  return '系统';
}

export default function TicketListPage() {
  const { message } = App.useApp();
  const admin = useAdminStore((s) => s.admin);
  const canReply = hasPermission(admin?.permissions, 'support:reply');
  const canAssign = hasPermission(admin?.permissions, 'support:assign');
  const [filterForm] = Form.useForm();
  const [replyForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null);
  const [replying, setReplying] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const { data, total, pageNo, pageSize, loading, reload, setPageNo, setPageSize, setExtraParams } =
    usePage<SupportTicket>('/admin/support/ticket/page');

  const currentTicket = detail?.ticket;

  const openDetail = async (record: SupportTicket) => {
    setDetailOpen(true);
    setDetailLoading(true);
    replyForm.resetFields();
    assignForm.setFieldsValue({
      ticketId: record.id,
      assignedAdminId: record.assignedAdminId,
      assignedGroup: record.assignedGroup,
    });
    statusForm.setFieldsValue({
      ticketId: record.id,
      status: record.status,
      remark: record.remark,
    });
    try {
      const result = await http.get<SupportTicketDetail, SupportTicketDetail>(`/admin/support/ticket/${record.id}`);
      setDetail(result);
    } finally {
      setDetailLoading(false);
    }
  };

  const onQuery = () => {
    setPageNo(1);
    setExtraParams(filterForm.getFieldsValue());
  };

  const onReply = async (values: any) => {
    setReplying(true);
    try {
      await http.post('/admin/support/ticket/reply', values);
      message.success('工单回复已发送');
      replyForm.resetFields();
      if (currentTicket) {
        await openDetail(currentTicket);
      }
      reload();
    } finally {
      setReplying(false);
    }
  };

  const onAssign = async (values: any) => {
    setAssigning(true);
    try {
      await http.post('/admin/support/ticket/assign', values);
      message.success('工单指派已更新');
      if (currentTicket) {
        await openDetail(currentTicket);
      }
      reload();
    } finally {
      setAssigning(false);
    }
  };

  const onStatus = async (values: any) => {
    setChangingStatus(true);
    try {
      await http.post('/admin/support/ticket/status', values);
      message.success('工单状态已更新');
      if (currentTicket) {
        await openDetail(currentTicket);
      }
      reload();
    } finally {
      setChangingStatus(false);
    }
  };

  const columns: ColumnsType<SupportTicket> = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 80, fixed: 'left' },
    { title: '工单号', dataIndex: 'ticketNo', width: 180 },
    { title: '用户ID', dataIndex: 'userId', width: 100 },
    { title: '账户', dataIndex: 'userAccount', width: 160, ellipsis: true },
    { title: '分类', dataIndex: 'category', width: 120 },
    { title: '标题', dataIndex: 'subject', width: 240, ellipsis: true },
    { title: '优先级', dataIndex: 'priority', width: 100, render: (value) => priorityTag(value) },
    { title: '状态', dataIndex: 'status', width: 110, render: (value) => statusTag(value) },
    { title: '来源', dataIndex: 'source', width: 100 },
    { title: '通道', dataIndex: 'channel', width: 120 },
    { title: '指派客服', dataIndex: 'assignedAdminId', width: 100, render: (value) => value ?? '--' },
    { title: '最近回复', dataIndex: 'lastReplyAt', width: 170, render: (value) => formatTime(value) },
    {
      title: '操作',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <a onClick={() => openDetail(record)}>查看</a>
        </Space>
      ),
    },
  ], []);

  return (
    <div className="admin-data-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Support</div>
          <h1 className="admin-page-title">客服工单</h1>
          <p className="admin-page-desc">集中查看正式客服工单，处理回复、状态流转和客服指派。</p>
        </div>
      </div>

      <div className="admin-filter-panel">
        <Form form={filterForm} layout="inline" className="admin-filter-form">
          <Form.Item name="ticketNo" label="工单号">
            <Input style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="userId" label="用户ID">
            <InputNumber style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Select allowClear style={{ width: 160 }} options={CATEGORY_OPTIONS} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select allowClear style={{ width: 140 }} options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="assignedAdminId" label="指派客服ID">
            <InputNumber style={{ width: 140 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={onQuery}>查询</Button>
              <Button onClick={() => { filterForm.resetFields(); setExtraParams({}); setPageNo(1); }}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </div>

      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">工单列表</div>
            <div className="admin-table-meta">共 {total} 条工单</div>
          </div>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          pagination={{
            current: pageNo,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPageNo(p);
              setPageSize(ps);
            },
          }}
          scroll={{ x: 1800 }}
        />
      </div>

      <Drawer
        title={currentTicket ? `工单详情 #${currentTicket.ticketNo}` : '工单详情'}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={820}
        destroyOnClose
      >
        {detailLoading || !detail ? (
          <div style={{ padding: 12 }}>加载中...</div>
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="工单号">{detail.ticket.ticketNo}</Descriptions.Item>
              <Descriptions.Item label="状态">{statusTag(detail.ticket.status)}</Descriptions.Item>
              <Descriptions.Item label="用户ID">{detail.ticket.userId}</Descriptions.Item>
              <Descriptions.Item label="账户">{detail.ticket.userAccount || '--'}</Descriptions.Item>
              <Descriptions.Item label="分类">{detail.ticket.category}</Descriptions.Item>
              <Descriptions.Item label="优先级">{priorityTag(detail.ticket.priority)}</Descriptions.Item>
              <Descriptions.Item label="关联订单">{detail.ticket.relatedOrderNo || '--'}</Descriptions.Item>
              <Descriptions.Item label="关联交易对">{detail.ticket.relatedSymbol || '--'}</Descriptions.Item>
              <Descriptions.Item label="来源">{detail.ticket.source}</Descriptions.Item>
              <Descriptions.Item label="通道">{detail.ticket.channel}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatTime(detail.ticket.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="最近回复">{formatTime(detail.ticket.lastReplyAt || detail.ticket.updatedAt)}</Descriptions.Item>
              <Descriptions.Item label="标题" span={2}>{detail.ticket.subject}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{detail.ticket.remark || '--'}</Descriptions.Item>
            </Descriptions>

            <div className="admin-table-panel" style={{ padding: 16 }}>
              <div className="admin-table-title" style={{ marginBottom: 12 }}>沟通记录</div>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {detail.messages.map((item: SupportTicketMessage) => (
                  <div key={item.id} style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: 12, background: item.internalOnly ? '#fffbe6' : '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <strong>{senderLabel(item.senderType)}</strong>
                      <span>{formatTime(item.createdAt)}</span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{item.content || '--'}</div>
                    {item.internalOnly === 1 && (
                      <Tag color="gold" style={{ marginTop: 10 }}>内部备注</Tag>
                    )}
                  </div>
                ))}
              </Space>
            </div>

            {canReply && (
              <div className="admin-table-panel" style={{ padding: 16 }}>
                <div className="admin-table-title" style={{ marginBottom: 12 }}>回复工单</div>
                <Form
                  form={replyForm}
                  layout="vertical"
                  initialValues={{ ticketId: detail.ticket.id, messageType: 'text', internalOnly: 0 }}
                  onFinish={onReply}
                >
                  <Form.Item name="ticketId" hidden>
                    <InputNumber />
                  </Form.Item>
                  <Form.Item name="messageType" label="消息类型">
                    <Select
                      options={[
                        { value: 'text', label: '文本回复' },
                        { value: 'system', label: '系统说明' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="internalOnly" label="回复类型">
                    <Select
                      options={[
                        { value: 0, label: '发送给用户' },
                        { value: 1, label: '仅内部备注' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="assignedAdminId" label="发送时顺带指派客服ID">
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="content" label="回复内容" rules={[{ required: true, message: '请输入回复内容' }]}>
                    <Input.TextArea rows={5} />
                  </Form.Item>
                  <Button type="primary" loading={replying} onClick={() => replyForm.submit()}>
                    发送回复
                  </Button>
                </Form>
              </div>
            )}

            {(canReply || canAssign) && (
              <div className="admin-table-panel" style={{ padding: 16 }}>
                <div className="admin-table-title" style={{ marginBottom: 12 }}>状态与指派</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {canReply ? (
                    <Form form={statusForm} layout="vertical" onFinish={onStatus}>
                      <Form.Item name="ticketId" hidden>
                        <InputNumber />
                      </Form.Item>
                      <Form.Item name="status" label="工单状态" rules={[{ required: true, message: '请选择状态' }]}>
                        <Select options={STATUS_OPTIONS} />
                      </Form.Item>
                      <Form.Item name="remark" label="处理备注">
                        <Input.TextArea rows={4} />
                      </Form.Item>
                      <Button loading={changingStatus} onClick={() => statusForm.submit()}>
                        更新状态
                      </Button>
                    </Form>
                  ) : (
                    <div />
                  )}

                  {canAssign ? (
                    <Form form={assignForm} layout="vertical" onFinish={onAssign}>
                      <Form.Item name="ticketId" hidden>
                        <InputNumber />
                      </Form.Item>
                      <Form.Item name="assignedAdminId" label="指派客服ID" rules={[{ required: true, message: '请输入客服ID' }]}>
                        <InputNumber style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="assignedGroup" label="客服组">
                        <Input />
                      </Form.Item>
                      <Button type="primary" loading={assigning} onClick={() => assignForm.submit()}>
                        保存指派
                      </Button>
                    </Form>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
}
