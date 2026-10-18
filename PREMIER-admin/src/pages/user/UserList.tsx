import { useState } from 'react';
import { App, Button, Descriptions, Form, Input, Modal, Select, Space, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import CoinSelect from '@/components/CoinSelect';
import http from '@/api/http';
import { exportCsv } from '@/utils/exportCsv';
import { usePage } from '@/utils/usePage';
import UserDepositAddressModal from './UserDepositAddressModal';

interface User {
  id: number;
  uid: string;
  account?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  status: number;
  kycLevel: number;
  vipLevel: number;
  createdAt: string;
}

interface UserDetail extends User {
  avatar?: string;
  inviteCode?: string;
  parentId?: number;
  lastLoginAt?: string;
  updatedAt?: string;
}

interface UserProfileFormValues {
  nickname?: string;
  countryCode?: string;
  phone?: string;
  email?: string;
}

const accountTypeMap: Record<number, string> = {
  1: '现货',
  2: '交易',
  3: '理财',
};

export default function UserList() {
  const { data, total, pageNo, pageSize, loading, setPageNo, setPageSize, setExtraParams, reload, extraParams } =
    usePage<User>('/admin/user/page');
  const [keyword, setKeyword] = useState(() => String(extraParams.keyword ?? ''));
  const [status, setStatus] = useState<number | undefined>(() => toNumber(extraParams.status));
  const [kycLevel, setKycLevel] = useState<number | undefined>(() => toNumber(extraParams.kycLevel));
  const { modal, message } = App.useApp();
  const nav = useNavigate();

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustUser, setAdjustUser] = useState<User | null>(null);
  const [depositAddressOpen, setDepositAddressOpen] = useState(false);
  const [depositAddressUser, setDepositAddressUser] = useState<User | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [security, setSecurity] = useState<any>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);

  const [adjustForm] = Form.useForm();
  const [profileForm] = Form.useForm<UserProfileFormValues>();

  const onSearch = () => {
    setPageNo(1);
    setExtraParams({ keyword, status, kycLevel });
  };

  const setStatusAction = (user: User, target: number) => {
    let reason = '';
    modal.confirm({
      title: target === 0 ? `冻结用户 ${user.uid}？` : `恢复用户 ${user.uid}？`,
      okText: target === 0 ? '确认冻结' : '确认恢复',
      okType: target === 0 ? 'danger' : 'primary',
      content: <Input.TextArea rows={3} placeholder="操作原因，必填" onChange={(e) => (reason = e.target.value)} />,
      onOk: async () => {
        if (!reason.trim()) {
          message.warning('请填写操作原因');
          return Promise.reject();
        }
        await http.post(`/admin/user/${user.id}/status`, { status: target, reason: reason.trim() });
        message.success('状态已更新');
        reload();
        if (detail?.id === user.id) {
          await refreshDetail(user.id);
        }
      },
    });
  };

  const submitAdjust = async (values: any) => {
    if (!adjustUser) return;
    if (!values.remark?.trim()) {
      message.warning('请填写操作原因');
      return;
    }

    modal.confirm({
      title: `确认给用户 ${adjustUser.uid} 调账？`,
      okText: '确认调账',
      okType: Number(values.delta) < 0 ? 'danger' : 'primary',
      content: `用户ID ${adjustUser.id}，币种 ${values.coin}，金额 ${values.delta}。该操作会直接变更用户余额。`,
      onOk: async () => {
        await http.post('/admin/asset/adjust', {
          userId: adjustUser.id,
          accountType: values.accountType,
          coin: values.coin,
          delta: values.delta,
          remark: values.remark.trim(),
        });
        message.success('调账成功');
        setAdjustOpen(false);
        adjustForm.resetFields();
      },
    });
  };

  const refreshDetail = async (userId: number) => {
    setDetailLoading(true);
    try {
      const [detailResp, accountResp, securityResp, walletResp, loginLogResp] = await Promise.all([
        http.get<UserDetail, UserDetail>(`/admin/user/${userId}`),
        http.get<any[], any[]>(`/admin/asset/account/${userId}`),
        http.get<any, any>(`/admin/user/${userId}/security`).catch(() => null),
        http.get<any[], any[]>(`/admin/user/${userId}/wallet/list`).catch(() => []),
        http.get<any, any>(`/admin/user/${userId}/login-log/page`).catch(() => ({ records: [] })),
      ]);

      setDetail(detailResp);
      setAccounts(accountResp ?? []);
      setSecurity(securityResp);
      setWallets(walletResp ?? []);
      setLoginLogs(loginLogResp?.records ?? []);
      profileForm.setFieldsValue({
        nickname: detailResp?.nickname ?? '',
        countryCode: detailResp?.countryCode ?? '',
        phone: detailResp?.phone ?? '',
        email: detailResp?.email ?? '',
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const showDetail = async (user: User) => {
    setDetailOpen(true);
    await refreshDetail(user.id);
  };

  const saveProfile = async (values: UserProfileFormValues) => {
    if (!detail?.id) return;
    setSavingProfile(true);
    try {
      const payload = {
        nickname: normalizeFormValue(values.nickname),
        countryCode: normalizeFormValue(values.countryCode),
        phone: normalizeFormValue(values.phone),
        email: normalizeFormValue(values.email),
      };
      const updated = await http.post<UserDetail, UserDetail>(`/admin/user/${detail.id}/profile`, payload);
      setDetail(updated);
      profileForm.setFieldsValue({
        nickname: updated?.nickname ?? '',
        countryCode: updated?.countryCode ?? '',
        phone: updated?.phone ?? '',
        email: updated?.email ?? '',
      });
      message.success('用户资料已保存');
      reload();
      await refreshDetail(detail.id);
    } finally {
      setSavingProfile(false);
    }
  };

  const resetUserPassword = (type: 'login' | 'pay') => {
    let password = '';
    modal.confirm({
      title: type === 'login' ? '重置登录密码' : '重置资金密码',
      content: <Input.Password placeholder="请输入新密码" onChange={(e) => (password = e.target.value)} />,
      onOk: async () => {
        if (!detail?.id) return;
        if (!password.trim()) {
          message.warning('请输入新密码');
          return Promise.reject();
        }
        if (password.trim().length < 6) {
          message.warning('密码长度不能少于 6 位');
          return Promise.reject();
        }
        await http.post(`/admin/user/${detail.id}/security/reset-${type}-password`, { password: password.trim() });
        message.success('密码已重置');
        await refreshDetail(detail.id);
      },
    });
  };

  const unbindSecurity = (type: 'google' | 'email' | 'phone') => {
    const label = { google: '谷歌验证', email: '邮箱', phone: '手机' }[type];
    modal.confirm({
      title: `解绑${label}？`,
      onOk: async () => {
        if (!detail?.id) return;
        await http.post(`/admin/user/${detail.id}/security/unbind`, { type, reason: `后台解绑${label}` });
        message.success('解绑成功');
        await refreshDetail(detail.id);
      },
    });
  };

  const jumpWithUser = (path: string, userId: number) => {
    nav(`${path}?userId=${userId}`);
  };

  const columns: ColumnsType<User> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'UID', dataIndex: 'uid', width: 120 },
    { title: '昵称', dataIndex: 'nickname', width: 160 },
    { title: '账号', dataIndex: 'account', width: 160 },
    { title: '邮箱', dataIndex: 'email', width: 220 },
    {
      title: '手机号',
      width: 180,
      render: (_, row) => formatPhone(row.countryCode, row.phone),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (value: number) => (value === 1 ? <Tag color="green">正常</Tag> : <Tag color="red">冻结</Tag>),
    },
    { title: 'KYC', dataIndex: 'kycLevel', width: 60 },
    { title: 'VIP', dataIndex: 'vipLevel', width: 60 },
    { title: '注册时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      fixed: 'right',
      width: 420,
      render: (_, user) => (
        <Space className="admin-actions" wrap>
          <a onClick={() => showDetail(user)}>详情/资产</a>
          {user.status === 1 ? (
            <a onClick={() => setStatusAction(user, 0)}>冻结</a>
          ) : (
            <a onClick={() => setStatusAction(user, 1)}>恢复</a>
          )}
          <a
            onClick={() => {
              setAdjustUser(user);
              setAdjustOpen(true);
            }}
          >
            调账
          </a>
          <a onClick={() => jumpWithUser('/finance/bills', user.id)}>账单</a>
          <a onClick={() => jumpWithUser('/trade/spot', user.id)}>订单</a>
          <a onClick={() => nav(`/report/invite?parentId=${user.id}`)}>邀请</a>
          <a
            onClick={() => {
              setDepositAddressUser(user);
              setDepositAddressOpen(true);
            }}
          >
            充值地址
          </a>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">User</div>
          <h1 className="admin-page-title">用户列表</h1>
          <p className="admin-page-desc">查询用户基础信息、认证状态和资产详情，并快速进入调账、账单、订单与邀请关系。</p>
        </div>
      </div>

      <div className="admin-filter-panel">
        <Space wrap>
          <Input
            placeholder="UID/账号/邮箱/手机号/昵称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 260 }}
          />
          <Select
            placeholder="状态"
            allowClear
            value={status}
            onChange={(value) => setStatus(value)}
            style={{ width: 120 }}
            options={[
              { value: 1, label: '正常' },
              { value: 0, label: '冻结' },
            ]}
          />
          <Select
            placeholder="KYC"
            allowClear
            value={kycLevel}
            onChange={(value) => setKycLevel(value)}
            style={{ width: 120 }}
            options={[
              { value: 0, label: '未认证' },
              { value: 1, label: '一级' },
              { value: 2, label: '二级' },
              { value: 3, label: '三级' },
            ]}
          />
          <Button type="primary" onClick={onSearch}>
            查询
          </Button>
          <Button
            onClick={() => {
              exportCsv('用户列表', data, columns as any[]);
              message.success('已导出当前页数据');
            }}
          >
            导出当前页
          </Button>
        </Space>
      </div>

      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">用户数据</div>
            <div className="admin-table-meta">共 {total} 条记录</div>
          </div>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          pagination={{
            current: pageNo,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPageNo(p);
              setPageSize(ps);
            },
          }}
          columns={columns}
          scroll={{ x: 1500 }}
        />
      </div>

      <Modal
        open={adjustOpen}
        title={`手动调账 - ${adjustUser?.uid ?? ''}`}
        onOk={() => adjustForm.submit()}
        onCancel={() => setAdjustOpen(false)}
        destroyOnClose
      >
        <Form form={adjustForm} layout="vertical" onFinish={submitAdjust} className="admin-modal-form">
          <Form.Item name="accountType" label="账户类型" initialValue={1} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 1, label: '现货' },
                { value: 2, label: '交易' },
                { value: 3, label: '理财' },
              ]}
            />
          </Form.Item>
          <Form.Item name="coin" label="币种" initialValue="USDT" rules={[{ required: true }]}>
            <CoinSelect />
          </Form.Item>
          <Form.Item name="delta" label="金额（正数加，负数扣）" rules={[{ required: true }]}>
            <Input placeholder="如 100 或 -50" />
          </Form.Item>
          <Form.Item name="remark" label="操作原因" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={detailOpen}
        title={`用户详情 - ${detail?.uid ?? ''}`}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={980}
        destroyOnClose={false}
      >
        <Form<UserProfileFormValues>
          form={profileForm}
          layout="vertical"
          onFinish={saveProfile}
          disabled={detailLoading}
          style={{ marginBottom: 12 }}
        >
          <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="ID">{detail?.id ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="UID">{detail?.uid ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="账号">{detail?.account ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              {detail?.status === 1 ? <Tag color="green">正常</Tag> : <Tag color="red">冻结</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="KYC">{detail?.kycLevel ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="VIP">{detail?.vipLevel ?? '-'}</Descriptions.Item>
          </Descriptions>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <Form.Item name="nickname" label="昵称">
              <Input placeholder="请输入昵称" maxLength={64} />
            </Form.Item>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                {
                  validator: (_, value) => {
                    if (!value?.trim()) return Promise.resolve();
                    return /\S+@\S+\.\S+/.test(value.trim())
                      ? Promise.resolve()
                      : Promise.reject(new Error('请输入正确的邮箱格式'));
                  },
                },
              ]}
            >
              <Input placeholder="留空表示清空邮箱" maxLength={128} />
            </Form.Item>
            <Form.Item name="countryCode" label="区号">
              <Input placeholder="如 86" maxLength={8} />
            </Form.Item>
            <Form.Item
              name="phone"
              label="手机号"
              dependencies={['countryCode']}
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, value) => {
                    const hasPhone = !!value?.trim();
                    const hasCode = !!getFieldValue('countryCode')?.trim();
                    if (hasPhone && !hasCode) {
                      return Promise.reject(new Error('填写手机号时请同时填写区号'));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <Input placeholder="留空表示清空手机号" maxLength={32} />
            </Form.Item>
          </div>

          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" loading={savingProfile}>
              保存资料
            </Button>
            <Button
              onClick={() => {
                profileForm.setFieldsValue({
                  nickname: detail?.nickname ?? '',
                  countryCode: detail?.countryCode ?? '',
                  phone: detail?.phone ?? '',
                  email: detail?.email ?? '',
                });
              }}
            >
              还原
            </Button>
          </Space>
        </Form>

        <Tabs
          items={[
            {
              key: 'accounts',
              label: '资产账户',
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  loading={detailLoading}
                  dataSource={accounts}
                  pagination={false}
                  columns={[
                    {
                      title: '账户',
                      dataIndex: 'accountType',
                      render: (value) => accountTypeMap[value] ?? value,
                    },
                    { title: '币种', dataIndex: 'coin' },
                    { title: '可用', dataIndex: 'available' },
                    { title: '冻结', dataIndex: 'frozen' },
                    { title: '更新时间', dataIndex: 'updatedAt' },
                  ]}
                />
              ),
            },
            {
              key: 'security',
              label: '安全状态',
              children: (
                <>
                  <Space style={{ marginBottom: 12 }} wrap>
                    <Button size="small" onClick={() => resetUserPassword('login')}>
                      重置登录密码
                    </Button>
                    <Button size="small" onClick={() => resetUserPassword('pay')}>
                      重置资金密码
                    </Button>
                    <Button size="small" onClick={() => unbindSecurity('google')}>
                      解绑谷歌
                    </Button>
                    <Button size="small" onClick={() => unbindSecurity('email')}>
                      解绑邮箱
                    </Button>
                    <Button size="small" onClick={() => unbindSecurity('phone')}>
                      解绑手机
                    </Button>
                  </Space>
                  <Descriptions size="small" bordered column={2}>
                    <Descriptions.Item label="邮箱绑定">{security?.emailBound === 1 ? '是' : '否'}</Descriptions.Item>
                    <Descriptions.Item label="手机绑定">{security?.phoneBound === 1 ? '是' : '否'}</Descriptions.Item>
                    <Descriptions.Item label="谷歌验证">{security?.googleEnabled === 1 ? '开启' : '关闭'}</Descriptions.Item>
                    <Descriptions.Item label="密码错误次数">{security?.wrongPwdCount ?? 0}</Descriptions.Item>
                    <Descriptions.Item label="锁定到">{security?.lockUntil ?? '-'}</Descriptions.Item>
                  </Descriptions>
                </>
              ),
            },
            {
              key: 'wallets',
              label: '绑定钱包',
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  loading={detailLoading}
                  dataSource={wallets}
                  pagination={false}
                  columns={[
                    { title: '钱包类型', dataIndex: 'walletType' },
                    { title: '链', dataIndex: 'chain' },
                    { title: '地址', dataIndex: 'address', ellipsis: true },
                    { title: '时间', dataIndex: 'createdAt' },
                  ]}
                />
              ),
            },
            {
              key: 'loginLogs',
              label: '登录日志',
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  loading={detailLoading}
                  dataSource={loginLogs}
                  pagination={false}
                  columns={[
                    { title: 'IP', dataIndex: 'ip' },
                    { title: '设备', dataIndex: 'device' },
                    { title: '地点', dataIndex: 'location' },
                    { title: '成功', dataIndex: 'success', render: (value) => (value === 1 ? '是' : '否') },
                    { title: '时间', dataIndex: 'createdAt' },
                  ]}
                />
              ),
            },
          ]}
        />
      </Modal>

      <UserDepositAddressModal
        open={depositAddressOpen}
        user={depositAddressUser}
        onClose={() => setDepositAddressOpen(false)}
      />
    </div>
  );
}

function toNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeFormValue(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function formatPhone(countryCode?: string, phone?: string) {
  if (!phone) return '-';
  return countryCode ? `+${countryCode} ${phone}` : phone;
}
