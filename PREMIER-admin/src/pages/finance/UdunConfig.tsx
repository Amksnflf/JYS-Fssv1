import { useEffect, useState } from 'react';
import { App, Button, Card, Form, Input, InputNumber, Switch } from 'antd';
import http from '@/api/http';

interface UdunConfigVO {
  enabled: boolean;
  gatewayUrl: string;
  merchantId: string;
  signKey: string;
  callbackUrl: string;
  addressExpireMinutes: number;
  connectTimeoutSeconds: number;
  readTimeoutSeconds: number;
}

export default function UdunConfig() {
  const [form] = Form.useForm<UdunConfigVO>();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    setLoading(true);
    http.get<UdunConfigVO, UdunConfigVO>('/admin/asset/udun-config')
      .then((data) => form.setFieldsValue(data))
      .finally(() => setLoading(false));
  }, [form]);

  const submit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      const saved = await http.post<UdunConfigVO, UdunConfigVO>('/admin/asset/udun-config/save', values);
      form.setFieldsValue(saved);
      message.success('优盾接口配置已保存');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Finance</div>
          <h1 className="admin-page-title">优盾接口配置</h1>
          <p className="admin-page-desc">配置优盾网关、商户号、签名密钥和回调地址。保存后后端立即按数据库配置读取。</p>
        </div>
      </div>
      <Card loading={loading}>
        <Form form={form} layout="vertical" style={{ maxWidth: 760 }} initialValues={{ enabled: false, addressExpireMinutes: 60, connectTimeoutSeconds: 10, readTimeoutSeconds: 20 }}>
          <Form.Item name="enabled" label="启用优盾充值" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="gatewayUrl" label="优盾网关地址" rules={[{ required: true, message: '请填写网关地址' }]}>
            <Input placeholder="https://openapi.uduncloud.com" />
          </Form.Item>
          <Form.Item name="merchantId" label="商户号" rules={[{ required: true, message: '请填写商户号' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="signKey" label="签名密钥" rules={[{ required: true, message: '请填写签名密钥' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="callbackUrl" label="回调地址" rules={[{ required: true, message: '请填写回调地址' }]}>
            <Input placeholder="https://api.com/api/callback/udun/transaction" />
          </Form.Item>
          <Form.Item name="addressExpireMinutes" label="充值地址有效分钟数" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="connectTimeoutSeconds" label="连接超时秒数" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="readTimeoutSeconds" label="读取超时秒数" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: 220 }} />
          </Form.Item>
          <Button type="primary" loading={loading} onClick={submit}>
            保存配置
          </Button>
        </Form>
      </Card>
    </div>
  );
}
