import { useEffect, useState } from 'react';
import { App, Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Table, Tabs, Tag } from 'antd';
import http from '@/api/http';

type TabKey = 'loan' | 'ai' | 'nftCollection' | 'nftItem';

const endpoints: Record<TabKey, { list: string; save: string; del: (id: number | string) => string; title: string }> = {
  loan: { list: '/admin/content/loan-product/list', save: '/admin/content/loan-product/save', del: (id) => `/admin/content/loan-product/${id}/delete`, title: '借币产品' },
  ai: { list: '/admin/content/ai-strategy/list', save: '/admin/content/ai-strategy/save', del: (id) => `/admin/content/ai-strategy/${id}/delete`, title: 'AI 策略' },
  nftCollection: { list: '/admin/content/nft-collection/list', save: '/admin/content/nft-collection/save', del: (id) => `/admin/content/nft-collection/${id}/delete`, title: 'NFT 集合' },
  nftItem: { list: '/admin/content/nft-item/page', save: '/admin/content/nft-item/save', del: (id) => `/admin/content/nft-item/${id}/delete`, title: 'NFT 单品' },
};

export default function AdvancedProductList() {
  const [tab, setTab] = useState<TabKey>('loan');
  const [data, setData] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const load = async (key = tab) => {
    const ep = endpoints[key];
    const res = await http.get<any, any>(ep.list, { params: { pageNo: 1, pageSize: 50 } });
    setData(Array.isArray(res) ? res : res?.records ?? []);
  };

  useEffect(() => { load(tab); }, [tab]);

  const onSave = async (values: any) => {
    await http.post(endpoints[tab].save, normalize(values));
    message.success('已保存');
    setOpen(false);
    load();
  };
  const remove = async (id: number | string) => {
    await http.post(endpoints[tab].del(id), { reason: '后台删除' });
    message.success('已删除');
    load();
  };

  return (
    <div>
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={[
          { key: 'loan', label: '借币产品' },
          { key: 'ai', label: 'AI 策略' },
          { key: 'nftCollection', label: 'NFT 集合' },
          { key: 'nftItem', label: 'NFT 单品' },
        ]}
      />
      <Button type="primary" onClick={() => { form.resetFields(); setOpen(true); }} style={{ marginBottom: 12 }}>
        新增
      </Button>
      <Table
        rowKey="id"
        dataSource={data}
        size="small"
        pagination={false}
        columns={[...columnsFor(tab), {
          title: '操作',
          width: 120,
          render: (_: unknown, r: any) => (
            <Space>
              <a onClick={() => { form.setFieldsValue(r); setOpen(true); }}>编辑</a>
              <Popconfirm title="确认删除？" onConfirm={() => remove(r.id)}><a style={{ color: '#ef4444' }}>删除</a></Popconfirm>
            </Space>
          ),
        }]}
      />
      <Modal
        title={`编辑${endpoints[tab].title}`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onSave} initialValues={initialValues(tab)}>
          <Form.Item name="id" hidden><Input /></Form.Item>
          {formItems(tab)}
        </Form>
      </Modal>
    </div>
  );
}

function columnsFor(tab: TabKey) {
  if (tab === 'loan') {
    return [
      { title: 'ID', dataIndex: 'id', width: 70 },
      { title: '币种', dataIndex: 'coin' },
      { title: '抵押率', dataIndex: 'collateralRatio', render: (v: string) => `${(Number(v) * 100).toFixed(0)}%` },
      { title: '日利率', dataIndex: 'dailyRate', render: (v: string) => `${(Number(v) * 100).toFixed(3)}%` },
      { title: '最长天数', dataIndex: 'maxDays' },
      { title: '启用', dataIndex: 'enabled', render: (v: number) => v ? <Tag color="green">开</Tag> : <Tag>关</Tag> },
    ];
  }
  if (tab === 'ai') {
    return [
      { title: 'ID', dataIndex: 'id', width: 70 },
      { title: '名称', dataIndex: 'name' },
      { title: '类型', dataIndex: 'strategyType' },
      { title: '最低投入', dataIndex: 'minAmount' },
      { title: '最高收益', dataIndex: 'maxApr', render: (v: string) => `${(Number(v) * 100).toFixed(2)}%` },
      { title: '用户数', dataIndex: 'userCount' },
      { title: '启用', dataIndex: 'enabled', render: (v: number) => v ? <Tag color="green">开</Tag> : <Tag>关</Tag> },
    ];
  }
  if (tab === 'nftCollection') {
    return [
      { title: 'ID', dataIndex: 'id', width: 70 },
      { title: '名称', dataIndex: 'name' },
      { title: '地板价', dataIndex: 'floorPrice' },
      { title: '数量', dataIndex: 'itemCount' },
      { title: '热门', dataIndex: 'isHot', render: (v: number) => v ? <Tag color="red">热</Tag> : '-' },
      { title: '排序', dataIndex: 'sort' },
    ];
  }
  return [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '集合', dataIndex: 'collectionId' },
    { title: '名称', dataIndex: 'name' },
    { title: '价格', render: (_: unknown, r: any) => `${r.price} ${r.coin}` },
    { title: 'Owner', dataIndex: 'ownerId' },
    { title: '状态', dataIndex: 'status', render: (v: number) => v === 1 ? <Tag color="green">在售</Tag> : v === 2 ? <Tag>已售</Tag> : <Tag>下架</Tag> },
  ];
}

function formItems(tab: TabKey) {
  if (tab === 'loan') {
    return (
      <Space wrap>
        <Form.Item name="coin" label="币种" rules={[{ required: true }]}><Input style={{ width: 140 }} /></Form.Item>
        <Form.Item name="collateralRatio" label="抵押率"><Input style={{ width: 140 }} /></Form.Item>
        <Form.Item name="dailyRate" label="日利率"><Input style={{ width: 140 }} /></Form.Item>
        <Form.Item name="maxDays" label="最长天数"><InputNumber min={1} /></Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked" getValueFromEvent={(c) => c ? 1 : 0} getValueProps={(v) => ({ checked: v === 1 })}><Switch /></Form.Item>
      </Space>
    );
  }
  if (tab === 'ai') {
    return (
      <>
        <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
        <Space wrap>
          <Form.Item name="strategyType" label="类型"><Input style={{ width: 160 }} /></Form.Item>
          <Form.Item name="minAmount" label="最低投入"><Input style={{ width: 140 }} /></Form.Item>
          <Form.Item name="maxApr" label="最高收益率"><Input style={{ width: 140 }} /></Form.Item>
          <Form.Item name="maxDrawdown" label="最大回撤"><Input style={{ width: 140 }} /></Form.Item>
          <Form.Item name="levelRequired" label="等级"><InputNumber min={0} /></Form.Item>
          <Form.Item name="userCount" label="用户数"><InputNumber min={0} /></Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked" getValueFromEvent={(c) => c ? 1 : 0} getValueProps={(v) => ({ checked: v === 1 })}><Switch /></Form.Item>
        </Space>
      </>
    );
  }
  if (tab === 'nftCollection') {
    return (
      <>
        <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="cover" label="封面"><Input /></Form.Item>
        <Space wrap>
          <Form.Item name="floorPrice" label="地板价"><Input style={{ width: 140 }} /></Form.Item>
          <Form.Item name="itemCount" label="数量"><InputNumber min={0} /></Form.Item>
          <Form.Item name="isHot" label="热门" valuePropName="checked" getValueFromEvent={(c) => c ? 1 : 0} getValueProps={(v) => ({ checked: v === 1 })}><Switch /></Form.Item>
          <Form.Item name="verified" label="认证" valuePropName="checked" getValueFromEvent={(c) => c ? 1 : 0} getValueProps={(v) => ({ checked: v === 1 })}><Switch /></Form.Item>
          <Form.Item name="sort" label="排序"><InputNumber /></Form.Item>
        </Space>
      </>
    );
  }
  return (
    <>
      <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="image" label="图片 URL" rules={[{ required: true }]}><Input /></Form.Item>
      <Space wrap>
        <Form.Item name="collectionId" label="集合 ID"><InputNumber min={1} /></Form.Item>
        <Form.Item name="price" label="价格"><Input style={{ width: 140 }} /></Form.Item>
        <Form.Item name="coin" label="币种"><Input style={{ width: 100 }} /></Form.Item>
        <Form.Item name="ownerId" label="Owner ID"><InputNumber min={1} /></Form.Item>
        <Form.Item name="status" label="状态"><InputNumber min={1} max={3} /></Form.Item>
      </Space>
    </>
  );
}

function initialValues(tab: TabKey) {
  if (tab === 'loan') return { collateralRatio: '0.7000', dailyRate: '0.000300', maxDays: 30, enabled: 1 };
  if (tab === 'ai') return { minAmount: '100', maxApr: '0.03', maxDrawdown: '0.1', levelRequired: 0, userCount: 0, enabled: 1 };
  if (tab === 'nftCollection') return { verified: 1, floorPrice: '0', itemCount: 0, isHot: 0, sort: 0 };
  return { coin: 'USDT', status: 1 };
}

function normalize(values: any) {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined && v !== ''));
}
