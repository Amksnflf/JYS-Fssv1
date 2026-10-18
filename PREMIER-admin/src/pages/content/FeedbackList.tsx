import { Alert, App, Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import http from '@/api/http';
import { usePage } from '@/utils/usePage';
import { exportCsv } from '@/utils/exportCsv';

type LegacyFeedbackRow = {
  id: number;
  userId: number;
  category?: string;
  content?: string;
  images?: string;
  status?: number;
  reply?: string;
  repliedBy?: number | null;
  repliedAt?: string | null;
  createdAt?: string;
};

const STATUS_OPTIONS = [
  { value: 0, label: '待处理' },
  { value: 1, label: '处理中' },
  { value: 2, label: '已关闭' },
];

function statusTag(status?: number) {
  const color = status === 2 ? 'default' : status === 1 ? 'blue' : 'orange';
  const label = STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status ?? '--';
  return <Tag color={color}>{label}</Tag>;
}

export default function FeedbackList() {
  const { message } = App.useApp();
  const [status, setStatus] = useState<number | undefined>();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<LegacyFeedbackRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const { data, total, pageNo, pageSize, loading, reload, setPageNo, setPageSize, setExtraParams } =
    usePage<LegacyFeedbackRow>('/admin/content/feedback/page');

  const reply = (record: LegacyFeedbackRow) => {
    setCurrent(record);
    form.setFieldsValue({ id: record.id, status: record.status ?? 1, reply: record.reply });
    setOpen(true);
  };

  const save = async (values: any) => {
    setSaving(true);
    try {
      await http.post('/admin/content/feedback/reply', values);
      message.success('兼容反馈已同步到新工单');
      setOpen(false);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const quickStatus = async (record: LegacyFeedbackRow, nextStatus: number) => {
    await http.post('/admin/content/feedback/reply', {
      id: record.id,
      status: nextStatus,
      reply: record.reply || (nextStatus === 2 ? '后台关闭' : '后台重新打开'),
    });
    message.success('兼容反馈状态已更新');
    await reload();
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '用户 ID', dataIndex: 'userId', width: 100 },
    { title: '分类', dataIndex: 'category', width: 140, render: (value: string) => value || '--' },
    { title: '反馈内容', dataIndex: 'content', ellipsis: true, render: (value: string) => value || '--' },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: number) => statusTag(value) },
    { title: '回复', dataIndex: 'reply', ellipsis: true, render: (value: string) => value || '--' },
    { title: '反馈时间', dataIndex: 'createdAt', width: 180, render: (value: string) => value || '--' },
    { title: '回复时间', dataIndex: 'repliedAt', width: 180, render: (value: string) => value || '--' },
    {
      title: '操作',
      width: 180,
      render: (_: unknown, record: LegacyFeedbackRow) => (
        <Space>
          <a onClick={() => reply(record)}>处理</a>
          {record.status === 2 ? (
            <a onClick={() => quickStatus(record, 1)}>重新打开</a>
          ) : (
            <a onClick={() => quickStatus(record, 2)}>关闭</a>
          )}
        </Space>
      ),
    },
  ], []);

  return (
    <div className="admin-data-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Content</div>
          <h1 className="admin-page-title">旧反馈兼容处理</h1>
          <p className="admin-page-desc">
            旧 feedback 已兼容接入正式客服工单表。这里保留老权限入口，但处理结果会同步写入新工单体系。
          </p>
        </div>
      </div>

      <div className="admin-support-card">
        <Alert
          type="warning"
          showIcon
          message="已进入兼容阶段"
          description="旧 /feedback 提交、查询、后台回复都已接到 t_support_ticket + t_support_ticket_message。后续建议逐步切到“客服工单”页做统一处理。"
        />
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <Space>
            <Select
              allowClear
              placeholder="状态"
              style={{ width: 140 }}
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
            />
            <Button type="primary" onClick={() => { setPageNo(1); setExtraParams({ status }); }}>
              查询
            </Button>
          </Space>
        </div>
        <div className="admin-toolbar-right">
          <Button onClick={() => { exportCsv('旧反馈兼容视图', data, columns as any); message.success('已导出当前页数据'); }}>
            导出当前页
          </Button>
        </div>
      </div>

      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">旧反馈兼容记录</div>
            <div className="admin-table-meta">共 {total} 条 channel=feedback 兼容记录。</div>
          </div>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns as any}
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
          scroll={{ x: 1400 }}
        />
      </div>

      <Modal
        title={current ? `兼容反馈处理 #${current.id}` : '兼容反馈处理'}
        open={open}
        confirmLoading={saving}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="id" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="reply" label="回复内容" rules={[{ required: true, message: '请输入回复内容' }]}>
            <Input.TextArea rows={5} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
