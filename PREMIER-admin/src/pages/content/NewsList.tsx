import { useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { App, Button, DatePicker, Form, Input, Modal, Select, Space, Switch, Table, Tag, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import http from '@/api/http';
import { usePage } from '@/utils/usePage';
import { compressImageFile } from '@/utils/url';
import { brandName } from '@/brand';

interface NewsRecord {
  id?: number;
  title: string;
  summary?: string;
  content: string;
  cover?: string;
  author?: string;
  authorAvatar?: string;
  sourceName?: string;
  sourceUrl?: string;
  lang: string;
  published?: number;
  likeCount?: number;
  viewCount?: number;
  publishedAt?: string;
  externalId?: string;
}

interface NewsFormValues extends Omit<NewsRecord, 'publishedAt' | 'content'> {
  publishedAt?: Dayjs;
  contentText: string;
}

interface SyncResult {
  fetched: number;
  inserted: number;
  processed: number;
}

interface UploadResult {
  path: string;
  url: string;
}

const LANG_OPTIONS = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
];

export default function NewsListPage() {
  const { data, total, pageNo, pageSize, loading, setPageNo, setPageSize, setExtraParams, reload } =
    usePage<NewsRecord>('/admin/content/news/page');
  const [lang, setLang] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploadingField, setUploadingField] = useState<'cover' | 'authorAvatar' | null>(null);
  const [form] = Form.useForm<NewsFormValues>();
  const { message, modal } = App.useApp();
  const currentCover = Form.useWatch('cover', form);
  const currentAvatar = Form.useWatch('authorAvatar', form);

  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 72 },
      {
        title: '封面',
        dataIndex: 'cover',
        width: 92,
        render: (_: unknown, record: NewsRecord) => <MediaPreview src={record.cover} kind="cover" />,
      },
      {
        title: '头像',
        dataIndex: 'authorAvatar',
        width: 88,
        render: (_: unknown, record: NewsRecord) => <MediaPreview src={record.authorAvatar} kind="avatar" />,
      },
      { title: '标题', dataIndex: 'title' },
      { title: '作者', dataIndex: 'author', width: 120 },
      { title: '来源', dataIndex: 'sourceName', width: 140 },
      { title: '语言', dataIndex: 'lang', width: 100 },
      {
        title: '发布状态',
        dataIndex: 'published',
        width: 100,
        render: (value: number | undefined) =>
          value === 1 ? <Tag color="green">已发布</Tag> : <Tag>草稿</Tag>,
      },
      { title: '阅读', dataIndex: 'viewCount', width: 84 },
      { title: '发布时间', dataIndex: 'publishedAt', width: 180 },
      {
        title: '操作',
        width: 120,
        render: (_: unknown, record: NewsRecord) => (
          <Space>
            <a onClick={() => openEditor(record)}>编辑</a>
            <a style={{ color: '#ef4444' }} onClick={() => record.id && onDelete(record.id)}>
              删除
            </a>
          </Space>
        ),
      },
    ],
    []
  );

  const onSave = async (values: NewsFormValues) => {
    const { contentText, ...rest } = values;
    const payload: NewsRecord = {
      ...rest,
      content: contentText,
      publishedAt: values.publishedAt ? values.publishedAt.format('YYYY-MM-DDTHH:mm:ss') : undefined,
    };
    await http.post('/admin/content/news/save', payload);
    message.success('新闻已保存');
    setOpen(false);
    reload();
  };

  const onDelete = (id: number) => {
    modal.confirm({
      title: '确认删除这条新闻？',
      onOk: async () => {
        await http.post(`/admin/content/news/${id}/delete`);
        message.success('新闻已删除');
        reload();
      },
    });
  };

  const onSync = async () => {
    setSyncing(true);
    try {
      const result = await http.post<SyncResult, SyncResult>('/admin/content/news/sync', {});
      message.success(`同步完成：抓取 ${result.fetched} 条，新增 ${result.inserted} 条`);
      reload();
    } finally {
      setSyncing(false);
    }
  };

  const handleImageUpload =
    (field: 'cover' | 'authorAvatar'): UploadProps['customRequest'] =>
    async (options) => {
      setUploadingField(field);
      try {
        const compressed = await compressImageFile(options.file as Blob);
        const formData = new FormData();
        formData.append('file', compressed);
        formData.append('biz', 'news');
        const result = await http.post<UploadResult, UploadResult>('/admin/upload/image', formData);
        form.setFieldsValue({ [field]: resolveUploadedUrl(result) } as Partial<NewsFormValues>);
        message.success(field === 'cover' ? '封面上传成功' : '头像上传成功');
        options.onSuccess?.(result as never);
      } catch (error) {
        options.onError?.(error as Error);
      } finally {
        setUploadingField(null);
      }
    };

  const openEditor = (record?: NewsRecord) => {
    form.resetFields();
    if (!record) {
      form.setFieldsValue({
        lang: 'zh-CN',
        author: brandName,
        sourceName: 'Manual',
        published: 1,
        contentText: '',
      });
      setOpen(true);
      return;
    }
    form.setFieldsValue({
      ...record,
      contentText: htmlToPlainText(record.content || ''),
      publishedAt: record.publishedAt ? dayjs(record.publishedAt) : undefined,
    });
    setOpen(true);
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Select
          allowClear
          placeholder="语言"
          value={lang}
          onChange={(value) => {
            setLang(value);
            setPageNo(1);
            setExtraParams({ lang: value });
          }}
          style={{ width: 160 }}
          options={LANG_OPTIONS}
        />
        <Button onClick={onSync} loading={syncing}>
          同步新闻源
        </Button>
        <Button type="primary" onClick={() => openEditor()}>
          新建新闻
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{
          current: pageNo,
          pageSize,
          total,
          onChange: (nextPage, nextPageSize) => {
            setPageNo(nextPage);
            setPageSize(nextPageSize);
          },
        }}
        columns={columns}
        scroll={{ x: 1200 }}
      />

      <Modal
        title="编辑新闻"
        open={open}
        width={860}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form<NewsFormValues>
          form={form}
          layout="vertical"
          onFinish={onSave}
          initialValues={{
            lang: 'zh-CN',
            author: brandName,
            sourceName: 'Manual',
            published: 1,
          }}
        >
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="externalId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="cover" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="authorAvatar" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入新闻标题" />
          </Form.Item>

          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={3} placeholder="可选。留空时会根据正文自动提取摘要。" />
          </Form.Item>

          <Space align="start" wrap>
            <Form.Item name="lang" label="语言">
              <Select style={{ width: 160 }} options={LANG_OPTIONS} />
            </Form.Item>
            <Form.Item name="author" label="作者">
              <Input style={{ width: 160 }} placeholder={`如：${brandName}`} />
            </Form.Item>
            <Form.Item name="sourceName" label="来源">
              <Input style={{ width: 160 }} placeholder="如：Manual / Cointelegraph" />
            </Form.Item>
            <Form.Item
              name="published"
              label="立即发布"
              valuePropName="checked"
              getValueFromEvent={(checked) => (checked ? 1 : 0)}
              getValueProps={(value) => ({ checked: value === 1 })}
            >
              <Switch />
            </Form.Item>
          </Space>

          <Space align="start" wrap>
            <Form.Item name="publishedAt" label="发布时间">
              <DatePicker showTime style={{ width: 240 }} />
            </Form.Item>
            <Form.Item name="sourceUrl" label="原文地址">
              <Input style={{ width: 520 }} placeholder="可选，仅后台记录；前台不会展示该链接" />
            </Form.Item>
          </Space>

          <Form.Item label="新闻封面">
            <Space align="start" wrap>
              <MediaPreview src={currentCover} kind="cover" large />
              <Space direction="vertical" size={6}>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  customRequest={handleImageUpload('cover')}
                  disabled={uploadingField === 'cover'}
                >
                  <Button icon={<UploadOutlined />} loading={uploadingField === 'cover'}>
                    {currentCover ? '更换封面' : '点击上传封面'}
                  </Button>
                </Upload>
                <Button
                  onClick={() => form.setFieldsValue({ cover: undefined })}
                  disabled={!currentCover}
                >
                  清空封面
                </Button>
                <span style={{ color: '#999', fontSize: 12 }}>
                  支持 jpg、jpeg、png、webp、gif，上传后保存为本地图片路径。
                </span>
              </Space>
            </Space>
          </Form.Item>

          <Form.Item label="作者头像">
            <Space align="start" wrap>
              <MediaPreview src={currentAvatar} kind="avatar" large />
              <Space direction="vertical" size={6}>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  customRequest={handleImageUpload('authorAvatar')}
                  disabled={uploadingField === 'authorAvatar'}
                >
                  <Button icon={<UploadOutlined />} loading={uploadingField === 'authorAvatar'}>
                    {currentAvatar ? '更换头像' : '点击上传头像'}
                  </Button>
                </Upload>
                <Button
                  onClick={() => form.setFieldsValue({ authorAvatar: undefined })}
                  disabled={!currentAvatar}
                >
                  清空头像
                </Button>
                <span style={{ color: '#999', fontSize: 12 }}>
                  有真实头像就会优先显示；不上传时前台会自动使用随机头像兜底。
                </span>
              </Space>
            </Space>
          </Form.Item>

          <Form.Item
            name="contentText"
            label="正文内容"
            rules={[{ required: true, message: '请输入正文内容' }]}
            extra="直接输入正文即可，空行会自动分段；前台仅展示图片和正文，不展示原文跳转文案。"
          >
            <Input.TextArea
              rows={14}
              placeholder="请输入新闻正文。&#10;&#10;建议一段一段输入，空一行会在前台自动分段。"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function MediaPreview({
  src,
  kind,
  large = false,
}: {
  src?: string;
  kind: 'cover' | 'avatar';
  large?: boolean;
}) {
  const normalized = typeof src === 'string' ? src.trim() : '';
  const isAvatar = kind === 'avatar';
  const width = large ? (isAvatar ? 72 : 180) : isAvatar ? 36 : 64;
  const height = large ? (isAvatar ? 72 : 108) : isAvatar ? 36 : 40;

  if (!normalized) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius: isAvatar ? '50%' : 10,
          background: '#f3f4f6',
          color: '#9ca3af',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          overflow: 'hidden',
        }}
      >
        {isAvatar ? '无头像' : '无封面'}
      </div>
    );
  }

  return (
    <img
      src={resolveMediaUrl(normalized)}
      alt=""
      style={{
        width,
        height,
        borderRadius: isAvatar ? '50%' : 10,
        objectFit: 'cover',
        display: 'block',
        border: '1px solid #f0f0f0',
      }}
    />
  );
}

function resolveUploadedUrl(result: UploadResult) {
  return result.path?.trim() || result.url?.trim() || '';
}

function resolveMediaUrl(value: string) {
  if (!value) return '';
  const normalized = normalizeUploadPath(value);
  if (normalized.startsWith('/uploads/')) return `/api${normalized}`;
  return normalized;
}

function normalizeUploadPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/api/uploads/')) return trimmed.slice(4);
  if (trimmed.startsWith('api/uploads/')) return `/${trimmed.slice(4)}`;
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;

  const apiUploadsIndex = trimmed.indexOf('/api/uploads/');
  if (apiUploadsIndex >= 0) return trimmed.slice(apiUploadsIndex + 4);

  const uploadsIndex = trimmed.indexOf('/uploads/');
  if (uploadsIndex >= 0) return trimmed.slice(uploadsIndex);

  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function htmlToPlainText(value?: string) {
  const html = value?.trim();
  if (!html) {
    return '';
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const container = doc.body;
  container.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
  container
    .querySelectorAll('p, div, section, article, li, blockquote, h1, h2, h3, h4, figure, figcaption, tr')
    .forEach((node) => node.appendChild(doc.createTextNode('\n')));
  return (container.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}
