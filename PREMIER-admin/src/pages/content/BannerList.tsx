import { App, Button, Form, Image, Input, Modal, Select, Space, Switch, Table, Tag } from 'antd';
import { useState } from 'react';
import { usePage } from '@/utils/usePage';
import http from '@/api/http';

interface Banner {
  id?: number;
  title?: string;
  image: string;
  link?: string;
  position: string;
  lang: string;
  enabled: number;
  sort: number;
  createdAt?: string;
}

export default function BannerListPage() {
  const { data, total, pageNo, pageSize, loading, reload, setPageNo, setPageSize, setExtraParams } =
    usePage<Banner>('/admin/content/banner/page');
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<string | undefined>();
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();

  const save = async (v: any) => {
    await http.post('/admin/content/banner/save', {
      ...v,
      enabled: v.enabled ? 1 : 0,
    });
    message.success('已保存');
    setOpen(false);
    reload();
  };

  const remove = (id: number) => {
    modal.confirm({
      title: '删除该 Banner？',
      onOk: async () => {
        await http.post(`/admin/content/banner/${id}/delete`);
        message.success('已删除');
        reload();
      },
    });
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Select
          allowClear
          placeholder="位置"
          value={position}
          onChange={(v) => { setPosition(v); setPageNo(1); setExtraParams({ position: v }); }}
          style={{ width: 140 }}
          options={[{ value: 'home', label: '首页' }, { value: 'market', label: '市场' }, { value: 'asset', label: '资产' }]}
        />
        <Button type="primary" onClick={() => { form.resetFields(); form.setFieldsValue({ position: 'home', lang: 'zh-TW', enabled: true, sort: 0 }); setOpen(true); }}>
          新增 Banner
        </Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={data}
        loading={loading}
        pagination={{ current: pageNo, pageSize, total, onChange: (p, ps) => { setPageNo(p); setPageSize(ps); } }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: '图片', dataIndex: 'image', width: 130, render: (src) => <Image width={96} src={src} /> },
          { title: '标题', dataIndex: 'title' },
          { title: '链接', dataIndex: 'link', ellipsis: true },
          { title: '位置', dataIndex: 'position', width: 90 },
          { title: '语言', dataIndex: 'lang', width: 90 },
          { title: '启用', dataIndex: 'enabled', width: 80, render: (v) => v ? <Tag color="green">开</Tag> : <Tag>关</Tag> },
          { title: '排序', dataIndex: 'sort', width: 80 },
          { title: '创建时间', dataIndex: 'createdAt', width: 180 },
          {
            title: '操作',
            width: 130,
            render: (_, r: Banner) => (
              <Space>
                <a onClick={() => { form.setFieldsValue({ ...r, enabled: r.enabled === 1 }); setOpen(true); }}>编辑</a>
                <a style={{ color: '#ef4444' }} onClick={() => r.id && remove(r.id)}>删除</a>
              </Space>
            ),
          },
        ]}
      />
      <Modal title="Banner" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} width={640} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="title" label="标题"><Input /></Form.Item>
          <Form.Item name="image" label="图片 URL" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="link" label="跳转链接"><Input /></Form.Item>
          <Space>
            <Form.Item name="position" label="位置" rules={[{ required: true }]}>
              <Select style={{ width: 140 }} options={[{ value: 'home', label: '首页' }, { value: 'market', label: '市场' }, { value: 'asset', label: '资产' }]} />
            </Form.Item>
            <Form.Item name="lang" label="语言" rules={[{ required: true }]}>
              <Select style={{ width: 140 }} options={[{ value: 'zh-TW', label: '繁體' }, { value: 'zh-CN', label: '简体' }, { value: 'en', label: 'English' }]} />
            </Form.Item>
            <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="sort" label="排序"><Input /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
