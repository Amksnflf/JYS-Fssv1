import { Form, Input, Button, Card, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';
import { firstAccessibleMenuPath } from '@/layouts/AdminLayout';
import { brandLockupDarkUrl, brandName } from '@/brand';

export default function LoginPage() {
  const nav = useNavigate();
  const { message } = App.useApp();
  const login = useAdminStore((s) => s.login);

  const onFinish = async (v: { username: string; password: string }) => {
    try {
      await login(v.username, v.password);
      nav(firstAccessibleMenuPath(useAdminStore.getState().admin?.permissions));
    } catch (e: any) {
      message.error(e?.message ?? '登录失败');
    }
  };

  return (
    <div className="admin-login">
      <Card className="admin-login-card">
        <div className="admin-login-brand">
          <img src={brandLockupDarkUrl} alt={brandName} className="admin-login-lockup" />
          <h1 className="admin-login-title">{brandName} 管理后台</h1>
          <p className="admin-login-subtitle">登录后进入运营管理中心</p>
        </div>
        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item name="username" label="账号" rules={[{ required: true }]}>
            <Input placeholder="请输入管理员账号" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password placeholder="请输入密码" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
