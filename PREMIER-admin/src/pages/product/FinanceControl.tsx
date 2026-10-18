import { App, Button, Form, Input, InputNumber, Modal, Space, Table, Tabs } from 'antd';
import { useState } from 'react';
import http from '@/api/http';
import { usePage } from '@/utils/usePage';

const configs = {
  lock: { label: '锁仓订单', pageUrl: '/admin/finance-control/lock-order/page', profitUrl: (id: number) => `/admin/finance-control/lock-order/${id}/profit`, profitField: 'interest' },
  portfolio: { label: '组合订单', pageUrl: '/admin/finance-control/portfolio-order/page', profitUrl: (id: number) => `/admin/finance-control/portfolio-order/${id}/profit`, profitField: 'totalProfit' },
  ai: { label: 'AI 订单', pageUrl: '/admin/finance-control/ai-order/page', profitUrl: (id: number) => `/admin/finance-control/ai-order/${id}/profit`, profitField: 'totalProfit' },
};

export default function FinanceControl() {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Product</div>
          <h1 className="admin-page-title">收益干预</h1>
          <p className="admin-page-desc">针对锁仓、组合和 AI 订单调整展示收益，所有调整需填写操作原因。</p>
        </div>
      </div>
      <div className="admin-tabs-panel">
        <Tabs items={Object.entries(configs).map(([key, cfg]) => ({ key, label: cfg.label, children: <OrderTab cfg={cfg} /> }))} />
      </div>
    </div>
  );
}

function OrderTab({ cfg }: { cfg: (typeof configs)[keyof typeof configs] }) {
  const { message } = App.useApp();
  const [userId, setUserId] = useState<number | undefined>();
  const [current, setCurrent] = useState<any>();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const { data, total, pageNo, pageSize, loading, reload, setPageNo, setPageSize, setExtraParams } = usePage<any>(cfg.pageUrl);

  const open = (record: any) => {
    setCurrent(record);
    form.setFieldsValue({ profit: record[cfg.profitField], remark: '' });
  };

  const save = async (v: any) => {
    setSaving(true);
    try {
      await http.post(cfg.profitUrl(current.id), { ...v, remark: v.remark?.trim() });
      message.success('已调整展示收益');
      setCurrent(undefined);
      reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-filter-panel">
      <Space wrap>
        <InputNumber placeholder="用户ID" value={userId} onChange={(v) => setUserId(v ?? undefined)} />
        <Button type="primary" onClick={() => { setPageNo(1); setExtraParams({ userId }); }}>查询</Button>
      </Space>
      </div>
      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">{cfg.label}</div>
            <div className="admin-table-meta">共 {total} 条记录</div>
          </div>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          pagination={{ current: pageNo, pageSize, total, showSizeChanger: true, onChange: (p, ps) => { setPageNo(p); setPageSize(ps); } }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 80 },
            { title: '订单号', dataIndex: 'orderNo', width: 200 },
            { title: '用户ID', dataIndex: 'userId', width: 100 },
            { title: '金额', dataIndex: 'amount', width: 140 },
            { title: '当前收益', dataIndex: cfg.profitField, width: 140 },
            { title: '状态', dataIndex: 'status', width: 90 },
            { title: '时间', dataIndex: 'createdAt', width: 180 },
            { title: '操作', width: 120, render: (_, r) => <a onClick={() => open(r)}>调整收益</a> },
          ]}
          scroll={{ x: 1200 }}
        />
      </div>
      <Modal
        title="调整订单展示收益"
        open={Boolean(current)}
        confirmLoading={saving}
        onCancel={() => setCurrent(undefined)}
        onOk={() => form.submit()}
      >
        {current && (
          <div className="admin-table-meta" style={{ marginBottom: 12 }}>
            订单 {current.orderNo}，用户 #{current.userId}，当前收益 {current[cfg.profitField]}。调整会影响前台展示，请核对后提交。
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={save} className="admin-modal-form">
          <Form.Item name="profit" label="收益" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="remark" label="操作原因" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
