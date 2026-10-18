import { useState } from 'react';
import { App, Button, Card, Form, Input, Popconfirm, Select, Space, Switch, Table, Tag } from 'antd';
import http from '@/api/http';
import AdminUserSelect from '@/components/AdminUserSelect';
import SymbolSelect from '@/components/SymbolSelect';

interface Offset {
  id?: number;
  userId: number;
  symbol?: string;
  offsetType: number; // 1 percent 2 abs
  offsetValue: string;
  enabled: number;
  remark?: string;
  updatedAt?: string;
}

export default function QuoteOffsetPage() {
  const { message, modal } = App.useApp();
  const [userId, setUserId] = useState<number | null>(null);
  const [list, setList] = useState<Offset[]>([]);
  const [form] = Form.useForm();

  const load = async (uid: number) => {
    setUserId(uid);
    const rs = await http.get<Offset[], Offset[]>(`/admin/trade/offset/list/${uid}`);
    setList(rs ?? []);
  };

  const submit = async (v: any) => {
    if (!userId) return;
    if (!v.remark?.trim()) {
      message.warning('请填写操作原因');
      return;
    }
    modal.confirm({
      title: '确认保存行情偏移规则？',
      okText: '确认保存',
      content: `用户 #${userId}，交易对 ${v.symbol || '全部'}，偏移值 ${v.offsetValue}。该配置会影响该用户展示价和现货成交价。`,
      onOk: async () => {
        await http.post('/admin/trade/offset/save', {
          userId,
          symbol: v.symbol || null,
          offsetType: v.offsetType,
          offsetValue: v.offsetValue,
          enabled: v.enabled ? 1 : 0,
          remark: v.remark.trim(),
        });
        message.success('已保存');
        form.resetFields();
        load(userId);
      },
    });
  };

  const remove = async (id: number) => {
    await http.post(`/admin/trade/offset/${id}/delete`);
    message.success('已删除');
    if (userId) load(userId);
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
                setList([]);
              }
            }}
          />
        </Space>
        <p style={{ marginTop: 8, color: '#999' }}>
          说明：偏移仅影响该用户的展示价 + 现货成交价；不影响平台报表与定时任务（如强平/期权结算用 AllTick 原始价）。
        </p>
      </Card>

      {userId && (
        <>
          <Card title={`用户 #${userId} 的偏移规则`} style={{ marginBottom: 16 }}>
            <Table
              rowKey="id"
              dataSource={list}
              size="small"
              pagination={false}
              columns={[
                { title: 'ID', dataIndex: 'id', width: 70 },
                { title: '交易对', dataIndex: 'symbol', render: (v) => v || <Tag>全部</Tag> },
                { title: '类型', dataIndex: 'offsetType', render: (t) => t === 1 ? '百分比' : '绝对值' },
                { title: '值', dataIndex: 'offsetValue' },
                { title: '启用', dataIndex: 'enabled', render: (e) => e === 1 ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
                { title: '备注', dataIndex: 'remark' },
                { title: '更新时间', dataIndex: 'updatedAt' },
                {
                  title: '操作',
                  render: (_, r: Offset) => (
                    <Popconfirm
                      title="确认删除该行情偏移规则？"
                      description="删除后该用户对应交易对将不再应用偏移。"
                      okText="删除"
                      okButtonProps={{ danger: true }}
                      cancelText="取消"
                      onConfirm={() => r.id && remove(r.id)}
                    >
                      <a style={{ color: '#ef4444' }}>删除</a>
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </Card>

          <Card title="新增 / 修改偏移">
            <Form form={form} layout="vertical" onFinish={submit} style={{ maxWidth: 480 }}
              initialValues={{ offsetType: 1, enabled: true }}>
              <Form.Item name="symbol" label="交易对（留空 = 对所有生效）">
                <SymbolSelect />
              </Form.Item>
              <Form.Item name="offsetType" label="偏移类型" rules={[{ required: true }]}>
                <Select options={[{ value: 1, label: '百分比 (如 0.001 = 0.1%)' }, { value: 2, label: '绝对值 (单位:报价币)' }]} />
              </Form.Item>
              <Form.Item name="offsetValue" label="偏移值（正数=高报，负数=低报）" rules={[{ required: true }]}>
                <Input placeholder="如 0.002 或 -0.005" />
              </Form.Item>
              <Form.Item name="enabled" label="启用" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="remark" label="操作原因" rules={[{ required: true }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Form>
          </Card>
        </>
      )}
    </div>
  );
}
