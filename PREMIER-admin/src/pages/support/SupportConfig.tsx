import { useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, Col, Form, Input, Row, Select, Space, Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import http from '@/api/http';
import type { SupportConfigItem } from './types';

const CONFIG_KEYS = [
  'support.enabled',
  'support.mode',
  'support.vendor',
  'support.help_center_enabled',
  'support.ticket_enabled',
  'support.third_party_enabled',
  'support.third_party_type',
  'support.third_party_url',
  'support.third_party_script',
  'support.third_party_app_id',
  'support.third_party_secret_masked',
  'support.fallback_to_ticket',
  'support.default_priority',
] as const;

type ConfigKey = typeof CONFIG_KEYS[number];

type SupportConfigFormValues = {
  enabled: boolean;
  mode: string;
  vendor: string;
  helpCenterEnabled: boolean;
  ticketEnabled: boolean;
  thirdPartyEnabled: boolean;
  thirdPartyType: string;
  thirdPartyUrl: string;
  thirdPartyScript: string;
  thirdPartyAppId: string;
  thirdPartySecretMasked: string;
  fallbackToTicket: boolean;
  defaultPriority: string;
};

const DEFAULT_FORM_VALUES: SupportConfigFormValues = {
  enabled: true,
  mode: 'hub',
  vendor: 'none',
  helpCenterEnabled: true,
  ticketEnabled: true,
  thirdPartyEnabled: false,
  thirdPartyType: 'none',
  thirdPartyUrl: '',
  thirdPartyScript: '',
  thirdPartyAppId: '',
  thirdPartySecretMasked: '',
  fallbackToTicket: true,
  defaultPriority: '2',
};

const KEY_TO_FIELD: Record<ConfigKey, keyof SupportConfigFormValues> = {
  'support.enabled': 'enabled',
  'support.mode': 'mode',
  'support.vendor': 'vendor',
  'support.help_center_enabled': 'helpCenterEnabled',
  'support.ticket_enabled': 'ticketEnabled',
  'support.third_party_enabled': 'thirdPartyEnabled',
  'support.third_party_type': 'thirdPartyType',
  'support.third_party_url': 'thirdPartyUrl',
  'support.third_party_script': 'thirdPartyScript',
  'support.third_party_app_id': 'thirdPartyAppId',
  'support.third_party_secret_masked': 'thirdPartySecretMasked',
  'support.fallback_to_ticket': 'fallbackToTicket',
  'support.default_priority': 'defaultPriority',
};

const FIELD_TO_KEY = Object.fromEntries(
  Object.entries(KEY_TO_FIELD).map(([key, value]) => [value, key]),
) as Record<keyof SupportConfigFormValues, ConfigKey>;

const BOOLEAN_KEYS = new Set<ConfigKey>([
  'support.enabled',
  'support.help_center_enabled',
  'support.ticket_enabled',
  'support.third_party_enabled',
  'support.fallback_to_ticket',
]);

const MODE_OPTIONS = [
  { value: 'help_only', label: '仅帮助中心' },
  { value: 'hub', label: 'Support Hub' },
  { value: 'third_party_only', label: '仅第三方客服' },
];

const VENDOR_OPTIONS = [
  { value: 'none', label: '未配置' },
  { value: 'crisp', label: 'Crisp' },
  { value: 'intercom', label: 'Intercom' },
  { value: 'zendesk', label: 'Zendesk' },
  { value: 'custom', label: '自定义' },
];

const THIRD_PARTY_TYPE_OPTIONS = [
  { value: 'none', label: '不启用' },
  { value: 'external_url', label: '外链客服' },
  { value: 'embed_script', label: '嵌入脚本' },
];

const PRIORITY_OPTIONS = [
  { value: '1', label: '低' },
  { value: '2', label: '普通' },
  { value: '3', label: '高' },
  { value: '4', label: '紧急' },
];

function isBooleanValue(value?: string | null) {
  return value === 'true' || value === '1';
}

function valueToBooleanString(value: boolean) {
  return value ? 'true' : 'false';
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildFormValues(items: SupportConfigItem[]): SupportConfigFormValues {
  const next = { ...DEFAULT_FORM_VALUES };
  items.forEach((item) => {
    const key = item.configKey as ConfigKey;
    const field = KEY_TO_FIELD[key];
    if (!field) {
      return;
    }
    if (BOOLEAN_KEYS.has(key)) {
      next[field] = isBooleanValue(item.configValue) as never;
      return;
    }
    next[field] = (item.configValue ?? DEFAULT_FORM_VALUES[field]) as never;
  });
  return next;
}

function buildPreview(values: SupportConfigFormValues) {
  if (!values.enabled) {
    return '当前客服入口将优先回到帮助中心或工单兜底，不直接开放 Support Hub。';
  }
  if (values.mode === 'help_only') {
    return '当前所有客服入口会优先进入帮助中心。';
  }
  if (values.mode === 'third_party_only') {
    if (values.thirdPartyEnabled && values.thirdPartyType === 'external_url' && values.thirdPartyUrl.trim()) {
      return '当前所有客服入口会优先跳到第三方外链客服。';
    }
    if (values.thirdPartyEnabled && values.thirdPartyType === 'embed_script') {
      return '当前所有客服入口会优先进入站内在线客服承载页。';
    }
    return '当前设置为仅第三方客服，但第三方通道信息还不完整，将按兜底策略回到工单或帮助中心。';
  }
  return '当前客服入口先进入 Support Hub，再由用户选择帮助中心、在线客服或正式工单。';
}

function buildVendorHint(values: SupportConfigFormValues) {
  if (!values.thirdPartyEnabled || values.thirdPartyType === 'none') {
    return '第三方在线客服当前未启用。';
  }
  if (values.thirdPartyType === 'external_url') {
    return '适合接入独立客服站点、工单站、Telegram 客服页或供应商托管入口。';
  }
  if (values.vendor === 'crisp') {
    return 'Crisp 可直接填写 Website ID；若脚本留空，前台会自动按 Crisp 官方方式生成嵌入脚本。';
  }
  if (values.vendor === 'intercom') {
    return 'Intercom 可填写 app/workspace ID；若脚本留空，前台会自动生成标准嵌入代码。';
  }
  if (values.vendor === 'zendesk') {
    return 'Zendesk 可填写 snippet key；若脚本留空，前台会自动生成标准 snippet 脚本。';
  }
  if (values.vendor === 'custom') {
    return '自定义供应商建议直接粘贴官方完整脚本，并在正式环境做白名单与 CSP 校验。';
  }
  return '未选择已识别供应商时，只有手填脚本或外链地址才会生效。';
}

export default function SupportConfigPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<SupportConfigFormValues>();
  const [items, setItems] = useState<SupportConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewValues, setPreviewValues] = useState<SupportConfigFormValues>(DEFAULT_FORM_VALUES);

  const reload = async () => {
    setLoading(true);
    try {
      const result = await http.get<SupportConfigItem[], SupportConfigItem[]>('/admin/support/config/list');
      const list = result ?? [];
      setItems(list);
      const nextValues = buildFormValues(list);
      form.setFieldsValue(nextValues);
      setPreviewValues(nextValues);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const onValuesChange = (_: Partial<SupportConfigFormValues>, allValues: SupportConfigFormValues) => {
    setPreviewValues({
      ...DEFAULT_FORM_VALUES,
      ...allValues,
    });
  };

  const syncPayloads = (values: SupportConfigFormValues) => {
    const existingByKey = new Map(items.map((item) => [item.configKey, item]));
    return CONFIG_KEYS.map((configKey) => {
      const field = KEY_TO_FIELD[configKey];
      const current = existingByKey.get(configKey);
      const rawValue = values[field];
      const configValue = BOOLEAN_KEYS.has(configKey)
        ? valueToBooleanString(Boolean(rawValue))
        : String(rawValue ?? '').trim();

      return {
        id: current?.id,
        configKey,
        configValue,
        remark: current?.remark ?? '',
      } satisfies SupportConfigItem;
    });
  };

  const onSave = async (values: SupportConfigFormValues) => {
    setSaving(true);
    try {
      const payloads = syncPayloads(values);
      for (const payload of payloads) {
        await http.post('/admin/support/config/save', payload);
      }
      message.success('客服通道配置已保存');
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<SupportConfigItem> = useMemo(() => [
    { title: 'Key', dataIndex: 'configKey', width: 250 },
    { title: '模块', dataIndex: 'module', width: 100 },
    {
      title: '当前值',
      dataIndex: 'configValue',
      render: (value: string, record) =>
        BOOLEAN_KEYS.has(record.configKey as ConfigKey) ? (
          <Tag color={isBooleanValue(value) ? 'green' : 'default'}>
            {isBooleanValue(value) ? '开启' : '关闭'}
          </Tag>
        ) : (
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{value || '--'}</span>
        ),
    },
    { title: '备注', dataIndex: 'remark', width: 260, render: (value) => value || '--' },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (value) => value || '--' },
  ], []);

  const thirdPartyEnabled = Form.useWatch('thirdPartyEnabled', form) ?? DEFAULT_FORM_VALUES.thirdPartyEnabled;
  const thirdPartyType = Form.useWatch('thirdPartyType', form) ?? DEFAULT_FORM_VALUES.thirdPartyType;
  const vendor = Form.useWatch('vendor', form) ?? DEFAULT_FORM_VALUES.vendor;

  return (
    <div className="admin-data-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Support</div>
          <h1 className="admin-page-title">客服通道配置</h1>
          <p className="admin-page-desc">
            统一维护 Support Hub、帮助中心、正式工单与第三方在线客服的入口策略。
          </p>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <Space wrap>
            <Tag color="blue">support.*</Tag>
            <Tag color={previewValues.enabled ? 'green' : 'default'}>
              {previewValues.enabled ? '客服入口已启用' : '客服入口关闭'}
            </Tag>
            <span>{buildPreview(previewValues)}</span>
          </Space>
        </div>
        <div className="admin-toolbar-right">
          <Button onClick={reload} loading={loading}>刷新</Button>
          <Button type="primary" onClick={() => form.submit()} loading={saving}>
            保存配置
          </Button>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={DEFAULT_FORM_VALUES}
        onFinish={onSave}
        onValuesChange={onValuesChange}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card title="入口策略" className="admin-support-card" loading={loading}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="enabled" label="启用客服入口" valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="mode" label="默认模式" rules={[{ required: true, message: '请选择默认模式' }]}>
                    <Select options={MODE_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="helpCenterEnabled" label="帮助中心入口" valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="ticketEnabled" label="正式工单入口" valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="fallbackToTicket" label="第三方失败时回退工单" valuePropName="checked">
                    <Switch checkedChildren="回退工单" unCheckedChildren="不回退" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="defaultPriority" label="默认工单优先级" rules={[{ required: true, message: '请选择默认优先级' }]}>
                    <Select options={PRIORITY_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Alert
                type="info"
                showIcon
                message="当前入口效果预览"
                description={buildPreview(previewValues)}
              />
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card title="第三方在线客服" className="admin-support-card" loading={loading}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="thirdPartyEnabled" label="启用第三方客服" valuePropName="checked">
                    <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="vendor" label="供应商" rules={[{ required: true, message: '请选择供应商' }]}>
                    <Select options={VENDOR_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="thirdPartyType" label="接入方式" rules={[{ required: true, message: '请选择接入方式' }]}>
                    <Select options={THIRD_PARTY_TYPE_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="thirdPartyAppId" label="App ID / Website ID / Snippet Key">
                    <Input placeholder="如 Crisp Website ID / Intercom app_id / Zendesk key" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name="thirdPartyUrl"
                    label="第三方外链地址"
                    rules={thirdPartyEnabled && thirdPartyType === 'external_url'
                      ? [{ required: true, message: '请填写第三方外链地址' }]
                      : undefined}
                  >
                    <Input placeholder="https://support.example.com/chat" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="thirdPartyScript" label="自定义嵌入脚本">
                    <Input.TextArea
                      rows={6}
                      placeholder="<script>...</script>。留空时，Crisp / Intercom / Zendesk 会尝试按 App ID 自动生成。"
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="thirdPartySecretMasked" label="后台保留的密钥占位">
                    <Input placeholder="如需记录供应商后台密钥，可仅保存脱敏值或备注" />
                  </Form.Item>
                </Col>
              </Row>
              <Alert
                type={thirdPartyEnabled ? 'success' : 'warning'}
                showIcon
                message={thirdPartyEnabled ? `已启用 ${vendor === 'none' ? '第三方客服' : vendor}` : '第三方客服未启用'}
                description={buildVendorHint(previewValues)}
              />
            </Card>
          </Col>
        </Row>
      </Form>

      <Card
        title="接入建议"
        className="admin-support-card"
        extra={<Tag color="geekblue">正规交易所客服建议</Tag>}
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="标准化做法"
            description="前台建议统一先进入 Support Hub，再让用户进入帮助中心、正式工单或第三方在线客服，避免所有入口都直接跳外链。"
          />
          <Alert
            type="info"
            showIcon
            message="第三方厂商接入"
            description="Crisp、Intercom、Zendesk 已支持按 App ID 自动生成嵌入脚本；自定义厂商请直接填写完整官方脚本，并在上线前检查 CSP、域名白名单和隐私合规。"
          />
          <Alert
            type="warning"
            showIcon
            message="后台能力边界"
            description="当前后台已覆盖客服通道配置和正式工单回复流；第三方在线客服的实时聊天记录、坐席分配、机器人流程仍由第三方平台自身后台负责。"
          />
        </Space>
      </Card>

      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">原始配置明细</div>
            <div className="admin-table-meta">共 {items.length} 条 support.* 配置，用于核对数据库实际落库值。</div>
          </div>
        </div>
        <Table
          rowKey={(record) => `${record.id}-${record.configKey}`}
          loading={loading}
          dataSource={items}
          columns={columns}
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </div>
    </div>
  );
}
