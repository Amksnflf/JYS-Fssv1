import { App, Tabs, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminDataPage from '@/components/AdminDataPage';
import http from '@/api/http';

export default function FollowManage() {
  const { message } = App.useApp();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('traderId') ? 'order' : 'trader');

  useEffect(() => {
    if (searchParams.get('traderId')) {
      setActiveTab('order');
    }
  }, [searchParams]);

  return (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => {
        setActiveTab(key);
        if (key === 'trader' && searchParams.has('traderId')) {
          const next = new URLSearchParams(searchParams);
          next.delete('traderId');
          setSearchParams(next, { replace: true });
        }
      }}
      items={[
        {
          key: 'trader',
          label: '交易员',
          children: (
            <AdminDataPage<any>
              title="跟单交易员"
              url="/admin/ops/follow-trader/page"
              saveUrl="/admin/ops/follow-trader/save"
              deleteUrl={(r) => `/admin/ops/follow-trader/${r.id}/delete`}
              deletePermission="ops:follow"
              exportable
              actions={[
                {
                  label: '停用',
                  hidden: (r) => r.enabled === 0,
                  confirm: '确认停用该交易员？',
                  onClick: async (r, { reload }) => {
                    await http.post(`/admin/ops/follow-trader/${r.id}/status`, { status: 0, reason: '后台停用交易员' });
                    message.success('已停用');
                    reload();
                  },
                },
                {
                  label: '启用',
                  hidden: (r) => r.enabled !== 0,
                  onClick: async (r, { reload }) => {
                    await http.post(`/admin/ops/follow-trader/${r.id}/status`, { status: 1, reason: '后台启用交易员' });
                    message.success('已启用');
                    reload();
                  },
                },
                {
                  label: '跟随者',
                  onClick: (r) => nav(`/product/follow?traderId=${r.id}`),
                },
              ]}
              filters={[{ name: 'enabled', label: '状态', type: 'select', options: [{ value: 1, label: '启用' }, { value: 0, label: '停用' }] }]}
              editFields={[
                { name: 'userId', label: '关联用户ID', type: 'number' },
                { name: 'name', label: '名称', required: true },
                {
                  name: 'avatar',
                  label: '头像',
                  type: 'imageUpload',
                  uploadBiz: 'coin',
                  previewShape: 'circle',
                  hint: '沿用后台本地图片保存链路，入库格式与币种图片一致。',
                },
                { name: 'style', label: '风格' },
                { name: 'winRate', label: '胜率' },
                { name: 'pnlRate', label: '收益率' },
                { name: 'principal', label: '展示本金' },
                { name: 'enabled', label: '状态', type: 'select', options: [{ value: 1, label: '启用' }, { value: 0, label: '停用' }] },
                { name: 'sort', label: '排序', type: 'number' },
              ]}
              initialValues={{ enabled: 1, sort: 0, followers: 0, winRate: 0, pnlRate: 0, principal: 0 }}
              columns={[
                { title: 'ID', dataIndex: 'id', width: 80 },
                { title: '用户ID', dataIndex: 'userId', width: 100 },
                { title: '名称', dataIndex: 'name', width: 140 },
                { title: '风格', dataIndex: 'style', width: 160 },
                { title: '胜率', dataIndex: 'winRate', width: 100 },
                { title: '收益率', dataIndex: 'pnlRate', width: 100 },
                { title: '粉丝', dataIndex: 'followers', width: 90 },
                { title: '状态', dataIndex: 'enabled', width: 90, render: (v) => v === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag> },
              ]}
            />
          ),
        },
        {
          key: 'order',
          label: '跟单关系',
          children: (
            <AdminDataPage<any>
              url="/admin/ops/follow-order/page"
              exportable
              actions={[
                {
                  label: '取消跟单',
                  hidden: (r) => r.status !== 1,
                  danger: true,
                  confirm: (r) => `确认取消跟单关系 ${r.orderNo}？`,
                  onClick: async (r, { reload }) => {
                    await http.post(`/admin/ops/follow-order/${r.id}/status`, { status: 2, reason: '后台取消跟单' });
                    message.success('已取消跟单');
                    reload();
                  },
                },
                {
                  label: '恢复跟单',
                  hidden: (r) => r.status === 1,
                  confirm: (r) => `确认恢复跟单关系 ${r.orderNo}？`,
                  onClick: async (r, { reload }) => {
                    await http.post(`/admin/ops/follow-order/${r.id}/status`, { status: 1, reason: '后台恢复跟单' });
                    message.success('已恢复跟单');
                    reload();
                  },
                },
              ]}
              filters={[
                { name: 'userId', label: '用户ID', type: 'number' },
                { name: 'traderId', label: '交易员ID', type: 'number' },
                { name: 'status', label: '状态', type: 'select', options: [{ value: 1, label: '跟单中' }, { value: 2, label: '已取消' }] },
              ]}
              columns={[
                { title: 'ID', dataIndex: 'id', width: 80 },
                { title: '订单号', dataIndex: 'orderNo', width: 200 },
                { title: '用户ID', dataIndex: 'userId', width: 100 },
                { title: '交易员ID', dataIndex: 'traderId', width: 100 },
                { title: '金额', dataIndex: 'amount', width: 140 },
                { title: '最大杠杆', dataIndex: 'maxLeverage', width: 100 },
                { title: '状态', dataIndex: 'status', width: 100, render: (v) => v === 1 ? <Tag color="green">跟单中</Tag> : <Tag>已取消</Tag> },
                { title: '时间', dataIndex: 'createdAt', width: 180 },
              ]}
            />
          ),
        },
      ]}
    />
  );
}
