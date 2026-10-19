import { useEffect, useMemo, useState } from 'react';
import { App, Button, Checkbox, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Upload } from 'antd';
import type { UploadProps } from 'antd';
import http from '@/api/http';
import CoinSelect from '@/components/CoinSelect';
import { compressImageFile } from '@/utils/url';
import { UploadOutlined } from '@ant-design/icons';

interface CoinMeta {
  id?: number;
  code?: string;
  name?: string;
  logo?: string;
  logoStatus?: number;
}

interface UploadResult {
  path: string;
  url: string;
}

interface SymbolProduct {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  category: string;
  alltickCode?: string;
  primarySource?: string;
  primarySymbol?: string;
  backupSource?: string;
  backupSymbol?: string;
  klineSource?: string;
  klineSymbol?: string;
  depthSource?: string;
  depthSymbol?: string;
  tradeSource?: string;
  tradeSymbol?: string;
  wsSource?: string;
  wsSymbol?: string;
  statsMode?: string;
  depthMode?: string;
  tradeMode?: string;
  subscribeEnabled?: number;
  pricePrecision: number;
  amountPrecision: number;
  changePrecision: number;
  minAmount: string;
  maxLeverage: number;
  takerFee: string;
  makerFee: string;
  isHot: number;
  enabled?: number;
  sort: number;
  supportSpot: boolean;
  supportPerp: boolean;
  supportOption: boolean;
}

interface SymbolRow extends SymbolProduct {
  id?: number;
  tradeType: string;
}

interface SymbolQuoteCheckRow {
  id?: number;
  symbol: string;
  tradeType: string;
  category: string;
  baseCoin: string;
  quoteCoin: string;
  enabled?: number;
  subscribeEnabled?: number;
  primarySource?: string;
  primarySymbol?: string;
  wsSource?: string;
  wsSymbol?: string;
  klineSource?: string;
  klineSymbol?: string;
  tickOk: boolean;
  statsOk: boolean;
  klineOk: boolean;
  price?: string | null;
  change?: string | null;
  statsClose?: string | null;
  klineCount?: number;
  suspectReason?: string;
  routeInfo?: Record<string, string>;
}

type SymbolForm = SymbolProduct & {
  supportTypes?: string[];
};

const CATEGORY_OPTIONS = [
  { value: 'crypto', label: '加密货币' },
  { value: 'forex', label: '外汇' },
  { value: 'metal', label: '贵金属' },
  { value: 'commodity', label: '商品' },
  { value: 'index', label: '指数' },
  { value: 'stock', label: '股票' },
];
const CATEGORY_LABELS = Object.fromEntries(CATEGORY_OPTIONS.map((item) => [item.value, item.label]));

const TRADE_TYPE_OPTIONS = [
  { value: 'spot', label: '现货' },
  { value: 'perp', label: '合约' },
  { value: 'option', label: '期权' },
];

const SOURCE_OPTIONS = [
  { value: 'binance', label: 'Binance' },
  { value: 'htx', label: 'HTX' },
  { value: 'alltick', label: 'AllTick' },
  { value: 'htx_swap', label: 'HTX Swap' },
  { value: 'wallstreetcn', label: 'WallstreetCN (外汇)' },
];

const STATS_MODE_OPTIONS = [
  { value: 'source', label: '源直出' },
  { value: 'calc', label: '后端计算' },
];

const DEPTH_MODE_OPTIONS = [
  { value: 'native', label: '原生深度' },
  { value: 'limited', label: '受限深度' },
];

const TRADE_MODE_OPTIONS = [
  { value: 'native', label: '原生成交' },
  { value: 'limited', label: '受限成交' },
];

export default function SymbolListPage() {
  const [data, setData] = useState<SymbolProduct[]>([]);
  const [rawData, setRawData] = useState<SymbolRow[]>([]);
  const [coins, setCoins] = useState<CoinMeta[]>([]);
  const [coinUploadTarget, setCoinUploadTarget] = useState<'baseCoin' | 'quoteCoin' | null>(null);
  const [uploadingCoinLogo, setUploadingCoinLogo] = useState(false);
  const [category, setCategory] = useState<string | undefined>();
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [rawPageNo, setRawPageNo] = useState(1);
  const [rawPageSize, setRawPageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  const [checkingQuotes, setCheckingQuotes] = useState(false);
  const [quoteChecks, setQuoteChecks] = useState<SymbolQuoteCheckRow[]>([]);
  const [form] = Form.useForm<SymbolForm>();
  const [rawForm] = Form.useForm<SymbolRow>();
  const { message, modal } = App.useApp();

  const coinMap = useMemo(
    () =>
      coins.reduce<Record<string, CoinMeta>>((acc, coin) => {
        const code = coin.code?.toUpperCase();
        if (code) acc[code] = coin;
        return acc;
      }, {}),
    [coins]
  );

  const marketStats = useMemo(
    () => ({
      total: data.length,
      spot: data.filter((item) => item.supportSpot).length,
      perp: data.filter((item) => item.supportPerp).length,
      option: data.filter((item) => item.supportOption).length,
    }),
    [data]
  );

  const load = async () => {
    const list = await http.get<SymbolProduct[], SymbolProduct[]>('/admin/content/symbol/product/list', {
      params: { category },
    });
    setData(list ?? []);
  };

  const loadCoins = async () => {
    const list = await http.get<CoinMeta[], CoinMeta[]>('/admin/content/coin/list');
    setCoins(list ?? []);
  };

  useEffect(() => {
    setPageNo(1);
    load();
  }, [category]);

  useEffect(() => {
    loadCoins();
  }, []);

  const loadRaw = async () => {
    const list = await http.get<SymbolRow[], SymbolRow[]>('/admin/content/symbol/list');
    setRawData(list ?? []);
  };

  const loadQuoteChecks = async (targetCategory?: string) => {
    setCheckingQuotes(true);
    try {
      const list = await http.get<SymbolQuoteCheckRow[], SymbolQuoteCheckRow[]>('/admin/content/symbol/quote/check', {
        params: {
          tradeType: 'spot',
          category: targetCategory ?? category,
        },
      });
      setQuoteChecks(list ?? []);
      setCheckOpen(true);
    } finally {
      setCheckingQuotes(false);
    }
  };

  const openCreate = () => {
    form.resetFields();
    const initialValues = buildInitialValues(category ?? 'crypto');
    form.setFieldsValue(initialValues);
    setOpen(true);
  };

  const openEdit = (row: SymbolProduct) => {
    form.resetFields();
    form.setFieldsValue({
      ...row,
      supportTypes: [
        row.supportSpot ? 'spot' : null,
        row.supportPerp ? 'perp' : null,
        row.supportOption ? 'option' : null,
      ].filter(Boolean) as string[],
    });
    setOpen(true);
  };

  const onSave = async (values: SymbolForm) => {
    const supportTypes = values.supportTypes ?? [];
    const normalized = normalizeSymbolPayload(values);
    await http.post('/admin/content/symbol/product/save', {
      ...normalized,
      supportSpot: supportTypes.includes('spot'),
      supportPerp: supportTypes.includes('perp'),
      supportOption: supportTypes.includes('option'),
    });
    message.success('已保存');
    setOpen(false);
    load();
  };

  const onDelete = (symbol: string) => {
    modal.confirm({
      title: `删除 ${symbol}？`,
      content: '会删除这个交易市场及其现货、合约、期权配置。',
      onOk: async () => {
        await http.post(`/admin/content/symbol/product/${symbol}/delete`);
        message.success('已删除');
        load();
      },
    });
  };

  const openRaw = async () => {
    await loadRaw();
    editRaw();
    setRawOpen(true);
  };

  const editRaw = (row?: SymbolRow) => {
    rawForm.resetFields();
    rawForm.setFieldsValue(row ?? buildInitialValues(category ?? 'crypto'));
  };

  const saveRaw = async (values: SymbolRow) => {
    await http.post('/admin/content/symbol/save', normalizeSymbolPayload(values));
    message.success('交易对明细已保存');
    rawForm.resetFields();
    loadRaw();
    load();
  };

  const deleteRaw = (row: SymbolRow) => {
    modal.confirm({
      title: `删除 ${row.symbol}/${row.tradeType}？`,
      onOk: async () => {
        await http.post(`/admin/content/symbol/${row.id}/delete`);
        message.success('已删除');
        loadRaw();
        load();
      },
    });
  };

  const applyFormSourceDefaults = () => {
    form.setFieldsValue(applyRecommendedSourceFields(form.getFieldsValue(true)));
    message.success('已按当前分类填充推荐行情源配置');
  };

  const applyRawSourceDefaults = () => {
    rawForm.setFieldsValue(applyRecommendedSourceFields(rawForm.getFieldsValue(true)));
    message.success('已按当前分类填充推荐行情源配置');
  };

  const handleCoinLogoUpload: UploadProps['customRequest'] = async (options) => {
    if (!coinUploadTarget) {
      options.onError?.(new Error('coin upload target missing'));
      return;
    }
    const coinCode = form.getFieldValue(coinUploadTarget);
    const normalizedCoin = typeof coinCode === 'string' ? coinCode.trim().toUpperCase() : '';
    const coin = normalizedCoin ? coinMap[normalizedCoin] : undefined;
    if (!coin?.id || !normalizedCoin) {
      message.warning('请先选择要上传图标的币种');
      options.onError?.(new Error('coin not selected'));
      return;
    }

    setUploadingCoinLogo(true);
    try {
      const compressed = await compressImageFile(options.file as Blob);
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('biz', 'coin');
      const uploadResult = await http.post<UploadResult, UploadResult>('/admin/upload/image', formData);
      await http.post('/admin/content/coin/save', {
        ...coin,
        id: coin.id,
        code: normalizedCoin,
        logo: resolveUploadedLogo(uploadResult),
        logoStatus: 1,
      });
      message.success(`${normalizedCoin} 图标已上传并保存`);
      await loadCoins();
      await load();
      options.onSuccess?.(uploadResult as never);
    } catch (error) {
      options.onError?.(error as Error);
    } finally {
      setUploadingCoinLogo(false);
      setCoinUploadTarget(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Trade</div>
          <h1 className="admin-page-title">交易市场管理</h1>
          <p className="admin-page-desc">维护现货、合约和期权市场配置，统一管理交易对、图片、行情源、订阅状态和展示排序。</p>
        </div>
      </div>

      <div className="admin-filter-panel">
        <Space wrap>
          <Select
            allowClear
            placeholder="分类"
            value={category}
            onChange={setCategory}
            style={{ width: 160 }}
            options={CATEGORY_OPTIONS}
          />
          <Button type="primary" onClick={openCreate}>新增交易市场</Button>
          <Button onClick={openRaw}>基础交易对明细</Button>
        </Space>
      </div>

      <div className="admin-filter-panel">
        <Space wrap>
          <Button loading={checkingQuotes} onClick={() => loadQuoteChecks(category ?? 'forex')}>
            行情核查
          </Button>
        </Space>
      </div>

      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">交易市场</div>
            <div className="admin-table-meta">
              产品 {marketStats.total} 条，现货 {marketStats.spot} 条，合约 {marketStats.perp} 条，期权 {marketStats.option} 条
            </div>
          </div>
        </div>
        <Table
          rowKey="symbol"
          dataSource={data}
          size="small"
          pagination={{
            current: pageNo,
            pageSize,
            total: data.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '30', '50', '100'],
            onChange: (page, size) => {
              setPageNo(page);
              setPageSize(size);
            },
          }}
          columns={[
            {
              title: '交易对',
              dataIndex: 'symbol',
              width: 240,
              fixed: 'left',
              render: (_, row) => (
                <Space direction="vertical" size={4}>
                  <MarketPair baseCoin={row.baseCoin} quoteCoin={row.quoteCoin} coinMap={coinMap} />
                  <span style={{ color: '#999', fontSize: 12 }}>{row.symbol}</span>
                </Space>
              ),
            },
            {
              title: '分类',
              dataIndex: 'category',
              width: 100,
              render: (value) => CATEGORY_LABELS[value] ?? value,
            },
            {
              title: '主源 / 备源',
              width: 220,
              render: (_, row) => (
                <Space direction="vertical" size={4}>
                  <SourceBadge label="主" source={row.primarySource} symbol={row.primarySymbol} />
                  <SourceBadge label="备" source={row.backupSource} symbol={row.backupSymbol} emptyText="未配置备源" />
                </Space>
              ),
            },
            {
              title: 'K线 / 深度 / 成交 / WS',
              width: 300,
              render: (_, row) => (
                <Space direction="vertical" size={4}>
                  <SourceBadge label="K" source={row.klineSource} symbol={row.klineSymbol} />
                  <SourceBadge label="D" source={row.depthSource} symbol={row.depthSymbol} />
                  <SourceBadge label="T" source={row.tradeSource} symbol={row.tradeSymbol} />
                  <SourceBadge label="WS" source={row.wsSource} symbol={row.wsSymbol} />
                </Space>
              ),
            },
            {
              title: '能力模式',
              width: 180,
              render: (_, row) => (
                <Space size={4} wrap>
                  <Tag color="blue">{row.statsMode ?? '-'}</Tag>
                  <Tag color="geekblue">{row.depthMode ?? '-'}</Tag>
                  <Tag color="purple">{row.tradeMode ?? '-'}</Tag>
                </Space>
              ),
            },
            {
              title: '订阅池',
              dataIndex: 'subscribeEnabled',
              width: 90,
              render: (value) => value === 1 ? <Tag color="green">已订阅</Tag> : <Tag>候选池</Tag>,
            },
            {
              title: '支持交易',
              width: 180,
              render: (_, row) => (
                <Space size={4} wrap>
                  {row.supportSpot && <Tag color="blue">现货</Tag>}
                  {row.supportPerp && <Tag color="purple">合约</Tag>}
                  {row.supportOption && <Tag color="gold">期权</Tag>}
                  {!row.supportSpot && !row.supportPerp && !row.supportOption && <Tag>未启用</Tag>}
                </Space>
              ),
            },
            {
              title: '精度',
              width: 110,
              render: (_, row) => `${row.pricePrecision}/${row.amountPrecision}/${row.changePrecision ?? 2}`,
            },
            { title: '最小量', dataIndex: 'minAmount', width: 100 },
            { title: '杠杆', dataIndex: 'maxLeverage', width: 70 },
            { title: '手续费', width: 120, render: (_, row) => `${row.takerFee}/${row.makerFee}` },
            {
              title: '启用',
              dataIndex: 'enabled',
              width: 70,
              render: (value) => value === 0 ? <Tag>停用</Tag> : <Tag color="green">启用</Tag>,
            },
            {
              title: '热门',
              dataIndex: 'isHot',
              width: 60,
              render: (value) => value ? <Tag color="red">热</Tag> : '-',
            },
            { title: '排序', dataIndex: 'sort', width: 70 },
            {
              title: '操作',
              width: 140,
              fixed: 'right',
              render: (_, row) => (
                <Space className="admin-actions">
                  <a onClick={() => openEdit(row)}>编辑</a>
                  <a className="admin-danger-link" onClick={() => onDelete(row.symbol)}>删除</a>
                </Space>
              ),
            },
          ]}
          scroll={{ x: 2100 }}
        />
      </div>

      <Modal title="编辑交易市场" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} width={1180} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSave} className="admin-modal-form">
          <Space wrap align="end">
            <Form.Item name="symbol" label="symbol" rules={[{ required: true }]}><Input style={{ width: 160 }} /></Form.Item>
            <Form.Item name="category" label="分类" rules={[{ required: true }]}>
              <Select style={{ width: 140 }} options={CATEGORY_OPTIONS} />
            </Form.Item>
            <Form.Item label="基础币" required>
              <Space.Compact>
                <Form.Item name="baseCoin" noStyle rules={[{ required: true }]}>
                  <CoinSelect style={{ width: 150 }} marketEnabled={1} coins={coins} />
                </Form.Item>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  customRequest={handleCoinLogoUpload}
                  beforeUpload={() => {
                    setCoinUploadTarget('baseCoin');
                    return true;
                  }}
                  disabled={uploadingCoinLogo}
                >
                  <Button icon={<UploadOutlined />} loading={uploadingCoinLogo && coinUploadTarget === 'baseCoin'} />
                </Upload>
              </Space.Compact>
            </Form.Item>
            <Form.Item label="计价币" required>
              <Space.Compact>
                <Form.Item name="quoteCoin" noStyle rules={[{ required: true }]}>
                  <CoinSelect style={{ width: 150 }} marketEnabled={1} coins={coins} />
                </Form.Item>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  customRequest={handleCoinLogoUpload}
                  beforeUpload={() => {
                    setCoinUploadTarget('quoteCoin');
                    return true;
                  }}
                  disabled={uploadingCoinLogo}
                >
                  <Button icon={<UploadOutlined />} loading={uploadingCoinLogo && coinUploadTarget === 'quoteCoin'} />
                </Upload>
              </Space.Compact>
            </Form.Item>
            <Form.Item name="alltickCode" label="路由编码" tooltip="兼容当前存量字段，建议填真实第三方行情编码">
              <Input style={{ width: 160 }} placeholder="如 BTCUSDT" />
            </Form.Item>
            <Form.Item>
              <Button onClick={applyFormSourceDefaults}>按分类填充推荐源配置</Button>
            </Form.Item>
          </Space>

          <Form.Item name="supportTypes" label="支持交易" rules={[{ required: true, message: '至少选择一种交易类型' }]}>
            <Checkbox.Group options={TRADE_TYPE_OPTIONS} />
          </Form.Item>

          <Space wrap>
            <Form.Item name="primarySource" label="主源">
              <Select allowClear style={{ width: 150 }} options={SOURCE_OPTIONS} />
            </Form.Item>
            <Form.Item name="primarySymbol" label="主源编码">
              <Input style={{ width: 160 }} placeholder="如 BTCUSDT" />
            </Form.Item>
            <Form.Item name="backupSource" label="备源">
              <Select allowClear style={{ width: 150 }} options={SOURCE_OPTIONS} />
            </Form.Item>
            <Form.Item name="backupSymbol" label="备源编码">
              <Input style={{ width: 160 }} placeholder="如 BTCUSDT" />
            </Form.Item>
          </Space>

          <Space wrap>
            <Form.Item name="klineSource" label="K线源">
              <Select allowClear style={{ width: 150 }} options={SOURCE_OPTIONS} />
            </Form.Item>
            <Form.Item name="klineSymbol" label="K线编码">
              <Input style={{ width: 160 }} placeholder="跟主源一致可留空" />
            </Form.Item>
            <Form.Item name="depthSource" label="深度源">
              <Select allowClear style={{ width: 150 }} options={SOURCE_OPTIONS} />
            </Form.Item>
            <Form.Item name="depthSymbol" label="深度编码">
              <Input style={{ width: 160 }} placeholder="跟主源一致可留空" />
            </Form.Item>
          </Space>

          <Space wrap>
            <Form.Item name="tradeSource" label="成交源">
              <Select allowClear style={{ width: 150 }} options={SOURCE_OPTIONS} />
            </Form.Item>
            <Form.Item name="tradeSymbol" label="成交编码">
              <Input style={{ width: 160 }} placeholder="跟主源一致可留空" />
            </Form.Item>
            <Form.Item name="wsSource" label="WS 源">
              <Select allowClear style={{ width: 150 }} options={SOURCE_OPTIONS} />
            </Form.Item>
            <Form.Item name="wsSymbol" label="WS 编码">
              <Input style={{ width: 160 }} placeholder="跟主源一致可留空" />
            </Form.Item>
          </Space>

          <Space wrap>
            <Form.Item name="statsMode" label="24h 模式">
              <Select allowClear style={{ width: 150 }} options={STATS_MODE_OPTIONS} />
            </Form.Item>
            <Form.Item name="depthMode" label="深度模式">
              <Select allowClear style={{ width: 150 }} options={DEPTH_MODE_OPTIONS} />
            </Form.Item>
            <Form.Item name="tradeMode" label="成交模式">
              <Select allowClear style={{ width: 150 }} options={TRADE_MODE_OPTIONS} />
            </Form.Item>
            <Form.Item
              name="subscribeEnabled"
              label="加入订阅池"
              valuePropName="checked"
              getValueFromEvent={(checked) => (checked ? 1 : 0)}
              getValueProps={(value) => ({ checked: value === 1 })}
            >
              <Switch />
            </Form.Item>
          </Space>

          <Space wrap>
            <Form.Item name="pricePrecision" label="价格精度"><InputNumber min={0} max={10} /></Form.Item>
            <Form.Item name="amountPrecision" label="数量精度"><InputNumber min={0} max={10} /></Form.Item>
            <Form.Item name="changePrecision" label="涨跌幅精度"><InputNumber min={0} max={6} placeholder="默认 2" /></Form.Item>
            <Form.Item name="minAmount" label="最小量"><Input style={{ width: 120 }} /></Form.Item>
            <Form.Item name="maxLeverage" label="最大杠杆"><InputNumber min={1} /></Form.Item>
            <Form.Item name="takerFee" label="taker"><Input style={{ width: 100 }} /></Form.Item>
            <Form.Item name="makerFee" label="maker"><Input style={{ width: 100 }} /></Form.Item>
            <Form.Item
              name="enabled"
              label="启用"
              valuePropName="checked"
              getValueFromEvent={(checked) => (checked ? 1 : 0)}
              getValueProps={(value) => ({ checked: value !== 0 })}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="isHot"
              label="热门"
              valuePropName="checked"
              getValueFromEvent={(checked) => (checked ? 1 : 0)}
              getValueProps={(value) => ({ checked: value === 1 })}
            >
              <Switch />
            </Form.Item>
            <Form.Item name="sort" label="排序"><InputNumber /></Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal title="基础交易对明细" open={rawOpen} onCancel={() => setRawOpen(false)} footer={null} width={1400} destroyOnClose>
        <Form form={rawForm} layout="vertical" onFinish={saveRaw} className="admin-modal-form" style={{ marginBottom: 16 }}>
          <Form.Item name="id" hidden><Input /></Form.Item>

          <Space wrap align="end">
            <Form.Item name="symbol" label="symbol" rules={[{ required: true }]}><Input style={{ width: 130 }} /></Form.Item>
            <Form.Item name="tradeType" label="交易类型" rules={[{ required: true }]}>
              <Select style={{ width: 120 }} options={TRADE_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item name="category" label="分类" rules={[{ required: true }]}>
              <Select style={{ width: 130 }} options={CATEGORY_OPTIONS} />
            </Form.Item>
            <Form.Item name="baseCoin" label="基础币" rules={[{ required: true }]}>
              <CoinSelect style={{ width: 150 }} marketEnabled={1} coins={coins} />
            </Form.Item>
            <Form.Item name="quoteCoin" label="计价币" rules={[{ required: true }]}>
              <CoinSelect style={{ width: 150 }} marketEnabled={1} coins={coins} />
            </Form.Item>
            <Form.Item
              name="enabled"
              label="启用"
              valuePropName="checked"
              getValueFromEvent={(checked) => (checked ? 1 : 0)}
              getValueProps={(value) => ({ checked: value !== 0 })}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="subscribeEnabled"
              label="订阅池"
              valuePropName="checked"
              getValueFromEvent={(checked) => (checked ? 1 : 0)}
              getValueProps={(value) => ({ checked: value === 1 })}
            >
              <Switch />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">保存明细</Button>
                <Button onClick={() => editRaw()}>新增明细</Button>
                <Button onClick={applyRawSourceDefaults}>按分类填充推荐源配置</Button>
              </Space>
            </Form.Item>
          </Space>

          <Space wrap>
            <Form.Item name="alltickCode" label="路由编码"><Input style={{ width: 130 }} /></Form.Item>
            <Form.Item name="primarySource" label="主源">
              <Select allowClear style={{ width: 140 }} options={SOURCE_OPTIONS} />
            </Form.Item>
            <Form.Item name="primarySymbol" label="主源编码">
              <Input style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="backupSource" label="备源">
              <Select allowClear style={{ width: 140 }} options={SOURCE_OPTIONS} />
            </Form.Item>
            <Form.Item name="backupSymbol" label="备源编码">
              <Input style={{ width: 150 }} />
            </Form.Item>
          </Space>

          <Space wrap>
            <Form.Item name="klineSource" label="K线源">
              <Select allowClear style={{ width: 140 }} options={SOURCE_OPTIONS} />
            </Form.Item>
            <Form.Item name="klineSymbol" label="K线编码">
              <Input style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="depthSource" label="深度源">
              <Select allowClear style={{ width: 140 }} options={SOURCE_OPTIONS} />
            </Form.Item>
            <Form.Item name="depthSymbol" label="深度编码">
              <Input style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="tradeSource" label="成交源">
              <Select allowClear style={{ width: 140 }} options={SOURCE_OPTIONS} />
            </Form.Item>
            <Form.Item name="tradeSymbol" label="成交编码">
              <Input style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="wsSource" label="WS 源">
              <Select allowClear style={{ width: 140 }} options={SOURCE_OPTIONS} />
            </Form.Item>
            <Form.Item name="wsSymbol" label="WS 编码">
              <Input style={{ width: 150 }} />
            </Form.Item>
          </Space>

          <Space wrap>
            <Form.Item name="statsMode" label="24h 模式">
              <Select allowClear style={{ width: 140 }} options={STATS_MODE_OPTIONS} />
            </Form.Item>
            <Form.Item name="depthMode" label="深度模式">
              <Select allowClear style={{ width: 140 }} options={DEPTH_MODE_OPTIONS} />
            </Form.Item>
            <Form.Item name="tradeMode" label="成交模式">
              <Select allowClear style={{ width: 140 }} options={TRADE_MODE_OPTIONS} />
            </Form.Item>
            <Form.Item name="pricePrecision" label="价格精度"><InputNumber min={0} max={10} /></Form.Item>
            <Form.Item name="amountPrecision" label="数量精度"><InputNumber min={0} max={10} /></Form.Item>
            <Form.Item name="changePrecision" label="涨跌幅精度"><InputNumber min={0} max={6} /></Form.Item>
            <Form.Item name="minAmount" label="最小量"><Input style={{ width: 120 }} /></Form.Item>
            <Form.Item name="maxLeverage" label="最大杠杆"><InputNumber min={1} /></Form.Item>
            <Form.Item name="takerFee" label="taker"><Input style={{ width: 100 }} /></Form.Item>
            <Form.Item name="makerFee" label="maker"><Input style={{ width: 100 }} /></Form.Item>
            <Form.Item
              name="isHot"
              label="热门"
              valuePropName="checked"
              getValueFromEvent={(checked) => (checked ? 1 : 0)}
              getValueProps={(value) => ({ checked: value === 1 })}
            >
              <Switch />
            </Form.Item>
            <Form.Item name="sort" label="排序"><InputNumber /></Form.Item>
          </Space>
        </Form>

        <div className="admin-table-panel">
          <Table
            rowKey={(row) => String(row.id)}
            size="small"
            dataSource={rawData}
            pagination={{
              current: rawPageNo,
              pageSize: rawPageSize,
              total: rawData.length,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '30', '50'],
              onChange: (page, size) => {
                setRawPageNo(page);
                setRawPageSize(size);
              },
            }}
            columns={[
              { title: 'ID', dataIndex: 'id', width: 70 },
              {
                title: '交易对',
                dataIndex: 'symbol',
                width: 220,
                render: (_, row) => <MarketPair baseCoin={row.baseCoin} quoteCoin={row.quoteCoin} coinMap={coinMap} />,
              },
              { title: 'symbol', dataIndex: 'symbol', width: 120 },
              { title: '类型', dataIndex: 'tradeType', width: 90 },
              {
                title: '分类',
                dataIndex: 'category',
                width: 100,
                render: (value) => CATEGORY_LABELS[value] ?? value,
              },
              {
                title: '主源',
                width: 180,
                render: (_, row) => <SourceBadge label="主" source={row.primarySource} symbol={row.primarySymbol} />,
              },
              {
                title: '订阅池',
                dataIndex: 'subscribeEnabled',
                width: 90,
                render: (value) => value === 1 ? <Tag color="green">已订阅</Tag> : <Tag>候选池</Tag>,
              },
              {
                title: '启用',
                dataIndex: 'enabled',
                width: 70,
                render: (value) => value === 0 ? <Tag>停用</Tag> : <Tag color="green">启用</Tag>,
              },
              { title: '排序', dataIndex: 'sort', width: 70 },
              {
                title: '操作',
                width: 100,
                fixed: 'right',
                render: (_, row) => (
                  <Space className="admin-actions">
                    <a onClick={() => editRaw(row)}>编辑</a>
                    <a className="admin-danger-link" onClick={() => deleteRaw(row)}>删除</a>
                  </Space>
                ),
              },
            ]}
            scroll={{ x: 1300 }}
          />
        </div>
      </Modal>
      <Modal title="行情核查结果" open={checkOpen} onCancel={() => setCheckOpen(false)} footer={null} width={1500} destroyOnClose>
        <div className="admin-table-panel">
          <div className="admin-table-header">
            <div>
              <div className="admin-table-title">现货行情核查</div>
              <div className="admin-table-meta">共 {quoteChecks.length} 条，重点查看“可疑原因”不为“正常 / Normal”的记录</div>
            </div>
          </div>
          <Table
            rowKey={(row) => `${row.symbol}-${row.tradeType}`}
            size="small"
            dataSource={quoteChecks}
            pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }}
            columns={[
              {
                title: '交易对',
                width: 220,
                fixed: 'left',
                render: (_, row) => <MarketPair baseCoin={row.baseCoin} quoteCoin={row.quoteCoin} coinMap={coinMap} />,
              },
              { title: 'symbol', dataIndex: 'symbol', width: 130 },
              {
                title: '分类',
                dataIndex: 'category',
                width: 100,
                render: (value) => CATEGORY_LABELS[value] ?? value,
              },
              {
                title: 'Tick',
                width: 80,
                render: (_, row) => row.tickOk ? <Tag color="green">正常</Tag> : <Tag color="red">缺失</Tag>,
              },
              {
                title: '24h',
                width: 80,
                render: (_, row) => row.statsOk ? <Tag color="green">正常</Tag> : <Tag color="red">缺失</Tag>,
              },
              {
                title: 'K线',
                width: 80,
                render: (_, row) => row.klineOk ? <Tag color="green">正常</Tag> : <Tag color="red">缺失</Tag>,
              },
              { title: '价格', dataIndex: 'price', width: 120, render: (value) => value ?? '--' },
              { title: '涨幅', dataIndex: 'change', width: 110, render: (value) => value ?? '--' },
              { title: '24h收盘', dataIndex: 'statsClose', width: 120, render: (value) => value ?? '--' },
              {
                title: '订阅池',
                dataIndex: 'subscribeEnabled',
                width: 90,
                render: (value) => value === 1 ? <Tag color="green">已订阅</Tag> : <Tag>候选池</Tag>,
              },
              {
                title: '主路由',
                width: 220,
                render: (_, row) => <SourceBadge label="P" source={row.routeInfo?.priceSource ?? row.primarySource} symbol={row.routeInfo?.priceSymbol ?? row.primarySymbol} />,
              },
              {
                title: '公开Tick路由',
                width: 220,
                render: (_, row) => <SourceBadge label="WS" source={row.routeInfo?.publicTickSource ?? row.wsSource} symbol={row.routeInfo?.publicTickSymbol ?? row.wsSymbol} />,
              },
              {
                title: 'K线路由',
                width: 220,
                render: (_, row) => <SourceBadge label="K" source={row.routeInfo?.klineSource ?? row.klineSource} symbol={row.routeInfo?.klineSymbol ?? row.klineSymbol} />,
              },
              { title: 'K线数', dataIndex: 'klineCount', width: 80 },
              {
                title: '可疑原因',
                dataIndex: 'suspectReason',
                width: 260,
                render: (value) => (value === '正常' || value === 'Normal') ? <Tag color="green">{value}</Tag> : <Tag color="orange">{value ?? '--'}</Tag>,
              },
            ]}
            scroll={{ x: 2200 }}
          />
        </div>
      </Modal>
    </div>
  );
}

function buildInitialValues(category: string) {
  const base = {
    category,
    quoteCoin: 'USDT',
    pricePrecision: 2,
    amountPrecision: 4,
    changePrecision: 2,
    minAmount: '1',
    maxLeverage: 1,
    takerFee: '0.001',
    makerFee: '0.001',
    enabled: 1,
    subscribeEnabled: 0,
    isHot: 0,
    sort: 0,
  };
  return {
    ...base,
    ...buildRecommendedSourceDefaults(base),
    supportTypes: ['spot'],
    tradeType: 'spot',
  };
}

function normalizeSymbolPayload<T extends Partial<SymbolRow>>(values: T) {
  const normalizedBase = values.baseCoin?.trim().toUpperCase();
  const normalizedQuote = values.quoteCoin?.trim().toUpperCase();
  const normalizedSymbol = values.symbol?.trim().toUpperCase();
  const normalizedAlltickCode = trimOrUndefined(values.alltickCode) ?? normalizedSymbol?.replace(/-/g, '');
  const payload = {
    ...values,
    symbol: normalizedSymbol,
    baseCoin: normalizedBase,
    quoteCoin: normalizedQuote,
    alltickCode: normalizedAlltickCode,
  };
  return {
    ...payload,
    ...buildRecommendedSourceDefaults(payload),
  };
}

function applyRecommendedSourceFields<T extends Partial<SymbolRow>>(values: T) {
  return {
    ...values,
    ...buildRecommendedSourceDefaults(values),
  };
}

function buildRecommendedSourceDefaults<T extends Partial<SymbolRow>>(values: T) {
  const category = trimOrUndefined(values.category)?.toLowerCase();
  const crypto = category === 'crypto';
  const forex = category === 'forex';
  const htxSwapCategory = category === 'metal' || category === 'commodity' || category === 'index' || category === 'stock';
  const alltickCode = trimOrUndefined(values.alltickCode) ?? trimOrUndefined(values.symbol)?.replace(/-/g, '');
  const primarySource = trimOrUndefined(values.primarySource) ?? (crypto ? 'binance' : forex ? 'alltick' : htxSwapCategory ? 'htx_swap' : 'alltick');
  const primarySymbol = trimOrUndefined(values.primarySymbol) ?? alltickCode;
  const backupSource = trimOrUndefined(values.backupSource) ?? (crypto ? 'htx' : undefined);
  return {
    primarySource,
    primarySymbol,
    backupSource,
    backupSymbol: trimOrUndefined(values.backupSymbol),
    klineSource: trimOrUndefined(values.klineSource) ?? primarySource,
    klineSymbol: trimOrUndefined(values.klineSymbol) ?? primarySymbol,
    depthSource: trimOrUndefined(values.depthSource) ?? primarySource,
    depthSymbol: trimOrUndefined(values.depthSymbol) ?? primarySymbol,
    tradeSource: trimOrUndefined(values.tradeSource) ?? primarySource,
    tradeSymbol: trimOrUndefined(values.tradeSymbol) ?? primarySymbol,
    wsSource: trimOrUndefined(values.wsSource) ?? primarySource,
    wsSymbol: trimOrUndefined(values.wsSymbol) ?? primarySymbol,
    statsMode: trimOrUndefined(values.statsMode) ?? (crypto ? 'source' : forex ? 'calc' : 'source'),
    depthMode: trimOrUndefined(values.depthMode) ?? 'native',
    tradeMode: trimOrUndefined(values.tradeMode) ?? 'native',
    subscribeEnabled: values.subscribeEnabled ?? (forex ? 1 : 0),
  };
}

function trimOrUndefined(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function MarketPair(props: { baseCoin: string; quoteCoin: string; coinMap: Record<string, CoinMeta> }) {
  const { baseCoin, quoteCoin, coinMap } = props;
  return (
    <Space size={8}>
      <CoinBadge coin={baseCoin} meta={coinMap[baseCoin?.toUpperCase()]} />
      <span style={{ color: '#999' }}>/</span>
      <CoinBadge coin={quoteCoin} meta={coinMap[quoteCoin?.toUpperCase()]} />
    </Space>
  );
}

function CoinBadge(props: { coin: string; meta?: CoinMeta }) {
  const { coin, meta } = props;
  return (
    <Space size={6}>
      <CoinAvatar logo={meta?.logo} code={coin} />
      <span>{coin}</span>
    </Space>
  );
}

function CoinAvatar(props: { logo?: string; code: string }) {
  const imageUrl = resolveImageUrl(props.logo);
  const fallbackText = props.code?.slice(0, 1).toUpperCase() || '?';
  return imageUrl ? (
    <img
      src={imageUrl}
      alt={props.code}
      style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#f5f5f5' }}
    />
  ) : (
    <span
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: '#111827',
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {fallbackText}
    </span>
  );
}

function SourceBadge(props: { label: string; source?: string; symbol?: string; emptyText?: string }) {
  const { label, source, symbol, emptyText = '未配置' } = props;
  if (!source && !symbol) {
    return <span style={{ color: '#999', fontSize: 12 }}>{emptyText}</span>;
  }
  return (
    <Space size={6} wrap>
      <Tag style={{ marginInlineEnd: 0 }}>{label}</Tag>
      {source ? <Tag color="blue" style={{ marginInlineEnd: 0 }}>{source}</Tag> : null}
      <span style={{ fontSize: 12, color: '#555' }}>{symbol ?? '-'}</span>
    </Space>
  );
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
