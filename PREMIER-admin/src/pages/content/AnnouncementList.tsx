import { App, Button, Form, Input, Modal, Select, Space, Switch, Table, Tag } from 'antd';
import { useState } from 'react';
import { usePage } from '@/utils/usePage';
import http from '@/api/http';

interface Announcement {
  id?: number;
  title: string;
  content: string;
  category?: string;
  lang: string;
  top: number;
  published: number;
  publishedAt?: string;
  createdAt?: string;
}

export default function AnnouncementList() {
  const { data, total, pageNo, pageSize, loading, reload, setPageNo, setPageSize, setExtraParams } =
    usePage<Announcement>('/admin/content/announcement/page');
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<string | undefined>();
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();

  const save = async (v: any) => {
    await http.post('/admin/content/announcement/save', {
      ...v,
      top: v.top ? 1 : 0,
      published: v.published ? 1 : 0,
    });
    message.success('已保存');
    setOpen(false);
    reload();
  };

  const remove = (id: number) => {
    modal.confirm({
      title: '删除该公告？',
      onOk: async () => {
        await http.post(`/admin/content/announcement/${id}/delete`);
        message.success('已删除');
        reload();
      },
    });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '标题', dataIndex: 'title' },
    { title: '分类', dataIndex: 'category', width: 120 },
    { title: '语言', dataIndex: 'lang', width: 100 },
    {
      title: '置顶',
      dataIndex: 'top',
      width: 80,
      render: (v: number) => (v ? <Tag color="orange">置顶</Tag> : '-'),
    },
    {
      title: '发布',
      dataIndex: 'published',
      width: 80,
      render: (v: number) => (v ? <Tag color="green">已发布</Tag> : <Tag>草稿</Tag>),
    },
    { title: '发布时间', dataIndex: 'publishedAt', width: 180 },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      width: 140,
      render: (_: unknown, r: Announcement) => (
        <Space>
          <a onClick={() => { form.setFieldsValue({ ...r, top: r.top === 1, published: r.published === 1 }); setOpen(true); }}>编辑</a>
          <a style={{ color: '#ef4444' }} onClick={() => r.id && remove(r.id)}>删除</a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ marginTop: 0 }}>公告管理</h2>
        <Space>
          <Select
            allowClear
            placeholder="语言"
            value={lang}
            onChange={(v) => { setLang(v); setPageNo(1); setExtraParams({ lang: v }); }}
            style={{ width: 120 }}
            options={[{ value: 'zh-TW', label: '繁體' }, { value: 'zh-CN', label: '简体' }, { value: 'en', label: 'English' }]}
          />
          <Button type="primary" onClick={() => { form.resetFields(); form.setFieldsValue({ lang: 'zh-TW', top: false, published: true }); setOpen(true); }}>
            新建公告
          </Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: pageNo, pageSize, total, onChange: (p, ps) => { setPageNo(p); setPageSize(ps); } }}
      />
      <Modal title="公告" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} width={720} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Space>
            <Form.Item name="category" label="分类"><Input style={{ width: 140 }} /></Form.Item>
            <Form.Item name="lang" label="语言" rules={[{ required: true }]}>
              <Select style={{ width: 140 }} options={[{ value: 'zh-TW', label: '繁體' }, { value: 'zh-CN', label: '简体' }, { value: 'en', label: 'English' }]} />
            </Form.Item>
            <Form.Item name="top" label="置顶" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="published" label="发布" valuePropName="checked"><Switch /></Form.Item>
          </Space>
          <Form.Item name="publishedAt" label="发布时间（可选，格式 2026-04-30T15:00:00）"><Input /></Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true }]}><Input.TextArea rows={8} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
