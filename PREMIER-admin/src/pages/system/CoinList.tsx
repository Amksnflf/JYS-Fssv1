import { useEffect, useMemo, useState } from 'react';
import { App, Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import http from '@/api/http';

interface Coin {
  id?: number;
  code: string;
  name: string;
  assetCategory?: string;
  logo?: string;
  logoStatus?: number;
  chain?: string;
  decimals: number;
  minDeposit: string;
  minWithdraw: string;
  withdrawFee: string;
  depositEnabled: number;
  withdrawEnabled: number;
  walletEnabled?: number;
  marketEnabled?: number;
  quoteSymbol?: string;
  sort: number;
}

interface UploadResult {
  path: string;
  url: string;
}

const CATEGORY_OPTIONS = [
  { value: 'crypto', label: '加密资产' },
  { value: 'fiat', label: '法币' },
  { value: 'metal', label: '贵金属' },
  { value: 'commodity', label: '商品' },
  { value: 'index', label: '指数' },
  { value: 'stock', label: '股票' },
];

const CATEGORY_LABELS = Object.fromEntries(CATEGORY_OPTIONS.map((item) => [item.value, item.label]));
const PAGE_SIZE_OPTIONS = ['10', '20', '30', '50', '100'];

export default function CoinList() {
  const [data, setData] = useState<Coin[]>([]);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [form] = Form.useForm<Coin>();
  const { message } = App.useApp();
  const currentLogo = Form.useWatch('logo', form);
  const currentCode = Form.useWatch('code', form);
  const currentLogoStatus = Form.useWatch('logoStatus', form);

  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 70 },
      {
        title: '图片',
        dataIndex: 'logo',
        width: 84,
        render: (_: unknown, record: Coin) => <CoinLogo logo={record.logo} code={record.code} size={32} />,
      },
      { title: '代号', dataIndex: 'code', width: 110 },
      { title: '名称', dataIndex: 'name', width: 140 },
      {
        title: '分类',
        dataIndex: 'assetCategory',
        width: 110,
        render: (value: string) => <Tag>{CATEGORY_LABELS[value] ?? value ?? '-'}</Tag>,
      },
      {
        title: '图片状态',
        dataIndex: 'logoStatus',
        width: 110,
        render: (_: unknown, record: Coin) => (
          <Tag color={hasLogo(record.logo, record.logoStatus) ? 'green' : 'default'}>
            {hasLogo(record.logo, record.logoStatus) ? '已上传' : '未上传'}
          </Tag>
        ),
      },
      { title: '链', dataIndex: 'chain', width: 100 },
      { title: '最小储值', dataIndex: 'minDeposit', width: 110 },
      { title: '最小提现', dataIndex: 'minWithdraw', width: 110 },
      { title: '手续费', dataIndex: 'withdrawFee', width: 100 },
      {
        title: '储值',
        dataIndex: 'depositEnabled',
        width: 70,
        render: (value: number) => <Switch checked={!!value} disabled size="small" />,
      },
      {
        title: '提现',
        dataIndex: 'withdrawEnabled',
        width: 70,
        render: (value: number) => <Switch checked={!!value} disabled size="small" />,
      },
      {
        title: '钱包',
        dataIndex: 'walletEnabled',
        width: 70,
        render: (value: number) => <Switch checked={!!value} disabled size="small" />,
      },
      {
        title: '行情',
        dataIndex: 'marketEnabled',
        width: 70,
        render: (value: number) => <Switch checked={!!value} disabled size="small" />,
      },
      { title: '排序', dataIndex: 'sort', width: 70 },
      {
        title: '操作',
        width: 120,
        render: (_: unknown, record: Coin) => (
          <Space>
            <a onClick={() => openEdit(record)}>编辑</a>
            <Popconfirm title="确认删除？" onConfirm={() => remove(record.id)}>
              <a style={{ color: '#ef4444' }}>删除</a>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    []
  );

  const load = async () => {
    const list = await http.get<Coin[], Coin[]>('/admin/content/coin/list');
    setData(list ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(data.length / pageSize));
    if (pageNo > maxPage) setPageNo(maxPage);
  }, [data.length, pageNo, pageSize]);

  const handleLogoUpload: UploadProps['customRequest'] = async (options) => {
    const formData = new FormData();
    formData.append('file', options.file as Blob);
    formData.append('biz', 'coin');
    setUploading(true);
    try {
      const result = await http.post<UploadResult, UploadResult>('/admin/upload/image', formData);
      form.setFieldsValue({ logo: resolveUploadedLogo(result), logoStatus: 1 });
      message.success('图片上传成功');
      options.onSuccess?.(result as never);
    } catch (error) {
      options.onError?.(error as Error);
    } finally {
      setUploading(false);
    }
  };

  const openCreate = () => {
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (record: Coin) => {
    form.resetFields();
    form.setFieldsValue({
      ...record,
      assetCategory: record.assetCategory ?? 'crypto',
      walletEnabled: record.walletEnabled ?? 1,
      marketEnabled: record.marketEnabled ?? 1,
      logoStatus: record.logo ? 1 : record.logoStatus ?? 0,
    });
    setOpen(true);
  };

  const onSave = async (values: Coin) => {
    const payload: Coin = {
      ...values,
      code: values.code?.trim().toUpperCase(),
      name: values.name?.trim(),
      logo: values.logo?.trim(),
      logoStatus: values.logo?.trim() ? 1 : 0,
    };
    await http.post('/admin/content/coin/save', payload);
    message.success('已保存');
    setOpen(false);
    load();
  };

  const remove = async (id?: number) => {
    if (!id) return;
    await http.post(`/admin/content/coin/${id}/delete`, { reason: '后台删除' });
    message.success('已删除');
    load();
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Asset</div>
          <h1 className="admin-page-title">资产币种管理</h1>
          <p className="admin-page-desc">维护币种图标、链信息、充提开关、估值行情代码与展示排序。</p>
        </div>
        <Button type="primary" onClick={openCreate}>
          新增资产币种
        </Button>
      </div>

      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">资产币种</div>
            <div className="admin-table-meta">共 {data.length} 条记录</div>
          </div>
        </div>
        <Table
          rowKey="id"
          dataSource={data}
          size="small"
          columns={columns}
          pagination={{
            current: pageNo,
            pageSize,
            total: data.length,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            onChange: (page, size) => {
              setPageNo(page);
              setPageSize(size);
            },
          }}
          scroll={{ x: 1400 }}
        />
      </div>

      <Modal
        title="编辑资产币种"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        width={760}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSave}
          initialValues={{
            assetCategory: 'crypto',
            depositEnabled: 1,
            withdrawEnabled: 1,
            walletEnabled: 1,
            marketEnabled: 1,
            logoStatus: 0,
            decimals: 8,
            sort: 0,
          }}
        >
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="logo" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="logoStatus" hidden>
            <InputNumber />
          </Form.Item>

          <Form.Item label="币种图片">
            <Space align="start" wrap>
              <CoinLogo logo={currentLogo} code={currentCode || 'COIN'} size={56} />
              <Space direction="vertical" size={4}>
                <Tag color={hasLogo(currentLogo, currentLogoStatus) ? 'green' : 'default'}>
                  {hasLogo(currentLogo, currentLogoStatus) ? '已上传图片' : '未上传图片'}
                </Tag>
                <Upload accept="image/*" showUploadList={false} customRequest={handleLogoUpload} disabled={uploading}>
                  <Button icon={<UploadOutlined />} loading={uploading}>
                    {currentLogo ? '替换图片' : '上传图片'}
                  </Button>
                </Upload>
                <span style={{ color: '#999', fontSize: 12 }}>支持 jpg、jpeg、png、webp、gif，上传后将保存为本地图片路径。</span>
              </Space>
            </Space>
          </Form.Item>

          <Space wrap>
            <Form.Item name="code" label="代号" rules={[{ required: true }]}>
              <Input style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="name" label="名称" rules={[{ required: true }]}>
              <Input style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="assetCategory" label="资产分类" rules={[{ required: true }]}>
              <Select style={{ width: 140 }} options={CATEGORY_OPTIONS} />
            </Form.Item>
            <Form.Item name="chain" label="链">
              <Input style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="decimals" label="精度">
              <InputNumber min={0} max={18} />
            </Form.Item>
          </Space>

          <Space wrap>
            <Form.Item name="minDeposit" label="最小储值">
              <Input style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="minWithdraw" label="最小提现">
              <Input style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="withdrawFee" label="提现手续费">
              <Input style={{ width: 140 }} />
            </Form.Item>
            <Form.Item
              name="quoteSymbol"
              label="估值行情代码"
              tooltip="用于资产总览估值、闪兑报价、借币抵押估值，例如 BTCUSDT；稳定币可不填。"
            >
              <Input style={{ width: 180 }} placeholder="例如 BTCUSDT" />
            </Form.Item>
          </Space>

          <Space wrap>
            <Form.Item
              name="depositEnabled"
              label="允许储值"
              valuePropName="checked"
              getValueFromEvent={(checked) => (checked ? 1 : 0)}
              getValueProps={(value) => ({ checked: value === 1 })}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="withdrawEnabled"
              label="允许提现"
              valuePropName="checked"
              getValueFromEvent={(checked) => (checked ? 1 : 0)}
              getValueProps={(value) => ({ checked: value === 1 })}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="walletEnabled"
              label="钱包可用"
              valuePropName="checked"
              getValueFromEvent={(checked) => (checked ? 1 : 0)}
              getValueProps={(value) => ({ checked: value === 1 })}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="marketEnabled"
              label="行情可用"
              valuePropName="checked"
              getValueFromEvent={(checked) => (checked ? 1 : 0)}
              getValueProps={(value) => ({ checked: value === 1 })}
            >
              <Switch />
            </Form.Item>
            <Form.Item name="sort" label="排序">
              <InputNumber />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}

function CoinLogo(props: { logo?: string; code?: string; size?: number }) {
  const { logo, code = 'COIN', size = 32 } = props;
  const imageUrl = resolveImageUrl(logo);
  const fallbackText = code.slice(0, 1).toUpperCase() || '?';
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={code}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1px solid #f0f0f0',
          background: '#fff',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#111827',
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(12, Math.floor(size / 2.4)),
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {fallbackText}
    </span>
  );
}

function hasLogo(logo?: string, logoStatus?: number) {
  return Boolean((logo && logo.trim()) || logoStatus === 1);
}

function resolveImageUrl(value?: string) {
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;
  const normalized = normalizeUploadPath(value);
  if (normalized.startsWith('/uploads/')) return `/api${normalized}`;
  return normalized;
}

function resolveUploadedLogo(result: UploadResult) {
  return result.path?.trim() || result.url?.trim() || '';
}

function normalizeUploadPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/api/uploads/')) return trimmed;
  if (trimmed.startsWith('api/uploads/')) return `/${trimmed}`;
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;

  const apiUploadsIndex = trimmed.indexOf('/api/uploads/');
  if (apiUploadsIndex >= 0) return trimmed.slice(apiUploadsIndex);

  const uploadsIndex = trimmed.indexOf('/uploads/');
  if (uploadsIndex >= 0) return trimmed.slice(uploadsIndex);

  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
