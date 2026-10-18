import { useState } from 'react';
import { App, Button, Card, Form, Input, InputNumber, Select, Space, Tag } from 'antd';
import http from '@/api/http';
import AdminUserSelect from '@/components/AdminUserSelect';

interface WinRate {
  userId: number;
  mode: number; // 0 默认随机 1 必胜 2 必败 3 概率
  winRate: string;
  remark?: string;
  updatedAt?: string;
}

const MODE_LABEL: Record<number, string> = { 0: '默认（按真实价）', 1: '必胜', 2: '必败', 3: '概率' };

export default function WinRatePage() {
  const { message, modal } = App.useApp();
  const [data, setData] = useState<WinRate | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const load = async (uid: number) => {
    setUserId(uid);
    const w = await http.get<WinRate, WinRate>(`/admin/trade/winrate/${uid}`);
    setData(w);
    form.setFieldsValue(w ?? { mode: 0, winRate: 50 });
  };

  const submit = async (v: any) => {
    if (!userId) return;
    if (!v.remark?.trim()) {
      message.warning('请填写操作原因');
      return;
    }
    modal.confirm({
      title: '确认保存期权胜率配置？',
      okText: '确认保存',
      okType: v.mode === 0 ? 'primary' : 'danger',
      content: `用户 #${userId}，模式：${MODE_LABEL[v.mode]}，概率：${v.winRate}%。该配置会影响该用户期权秒合约结算结果。`,
      onOk: async () => {
        await http.post('/admin/trade/winrate/save', {
          userId,
          mode: v.mode,
          winRate: v.winRate,
          remark: v.remark.trim(),
        });
        message.success('已保存');
        load(userId);
      },
    });
  };

  return (
    <div>
      <Card title="选择用户" style={{ marginBottom: 16 }}>
        <Space>
          <AdminUserSelect
            value={userId ?? undefined}
            onChange={(v) => {
              if (v) load(v);
              else {
                setUserId(null);
                setData(null);
              }
            }}
          />
        </Space>
        <p style={{ marginTop: 8, color: '#999' }}>
          仅作用于该用户的"期权秒合约"结算结果；其它交易类型不受影响。
        </p>
      </Card>

      {userId && (
        <Card title={`用户 #${userId} 胜率配置`}>
          {data && <p>当前模式：<Tag color="blue">{MODE_LABEL[data.mode]}</Tag> 概率：{data.winRate}% · 更新于 {data.updatedAt}</p>}
          <Form form={form} layout="vertical" onFinish={submit} style={{ maxWidth: 420 }}>
            <Form.Item name="mode" label="模式" rules={[{ required: true }]}>
              <Select options={Object.entries(MODE_LABEL).map(([k, v]) => ({ value: Number(k), label: v }))} />
            </Form.Item>
            <Form.Item name="winRate" label="概率（mode=3 时使用，0-100）" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="remark" label="操作原因" rules={[{ required: true }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
            <Button type="primary" htmlType="submit">保存</Button>
          </Form>
        </Card>
      )}
    </div>
  );
}
