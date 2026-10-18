import { App, Button, Card, Form, Input, Select, Table } from 'antd';
import { useState } from 'react';
import http from '@/api/http';
import AdminUserSelect from '@/components/AdminUserSelect';
import CoinSelect from '@/components/CoinSelect';

interface Account {
  userId: number;
  accountType: number;
  coin: string;
  available: string;
  frozen: string;
}

const ACC: Record<number, string> = { 1: '现货', 2: '交易', 3: '理财' };

export default function AdjustPage() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [adjustForm] = Form.useForm();
  const [accs, setAccs] = useState<Account[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const lookup = async (v: { userId: number }) => {
    setUserId(v.userId);
    const list = await http.get<Account[], Account[]>(`/admin/asset/account/${v.userId}`);
    setAccs(list ?? []);
  };

  const submit = async (v: { accountType: number; coin: string; delta: string; remark?: string }) => {
    if (!userId) return message.warning('请先查询用户');
    if (!v.remark?.trim()) return message.warning('调账必须填写备注');
    modal.confirm({
      title: '确认执行手动调账？',
      okText: '确认调账',
      okType: Number(v.delta) < 0 ? 'danger' : 'primary',
      content: `用户 #${userId}，${ACC[v.accountType]}账户，${v.coin} ${v.delta}。该操作会直接变更用户余额。`,
      onOk: async () => {
        setSubmitting(true);
        try {
          await http.post('/admin/asset/adjust', {
            userId,
            accountType: v.accountType,
            coin: v.coin,
            delta: v.delta,
            remark: v.remark?.trim(),
          });
          message.success('调账成功');
          adjustForm.resetFields();
          lookup({ userId });
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  return (
    <div>
      <Card title="查询用户账户" style={{ marginBottom: 16 }}>
        <Form layout="inline" form={form} onFinish={lookup}>
          <Form.Item name="userId" rules={[{ required: true }]}>
            <AdminUserSelect />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            查询
          </Button>
        </Form>
      </Card>

      {userId && (
        <Card title={`用户 #${userId} 余额`} style={{ marginBottom: 16 }}>
          <Table
            rowKey={(r) => `${r.accountType}-${r.coin}`}
            dataSource={accs}
            pagination={false}
            size="small"
            columns={[
              { title: '账户', dataIndex: 'accountType', render: (v) => ACC[v] },
              { title: '币种', dataIndex: 'coin' },
              { title: '可用', dataIndex: 'available' },
              { title: '冻结', dataIndex: 'frozen' },
            ]}
          />
        </Card>
      )}

      <Card title="手动调账">
        <Form form={adjustForm} layout="vertical" onFinish={submit} style={{ maxWidth: 480 }}>
          <Form.Item name="accountType" label="账户类型" initialValue={1} rules={[{ required: true }]}>
            <Select
              options={Object.entries(ACC).map(([k, v]) => ({ value: Number(k), label: v }))}
            />
          </Form.Item>
          <Form.Item name="coin" label="币种" initialValue="USDT" rules={[{ required: true }]}>
            <CoinSelect />
          </Form.Item>
          <Form.Item name="delta" label="金额（正数加，负数扣）" rules={[{ required: true }]}>
            <Input placeholder="如 100 或 -50" />
          </Form.Item>
          <Form.Item name="remark" label="备注" rules={[{ required: true, message: '请填写调账备注' }]}>
            <Input placeholder="请填写调账原因或工单号" />
          </Form.Item>
          <Button type="primary" htmlType="submit" disabled={!userId} loading={submitting}>
            提交
          </Button>
        </Form>
      </Card>
    </div>
  );
}
