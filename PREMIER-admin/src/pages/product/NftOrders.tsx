import AdminDataPage from '@/components/AdminDataPage';
import { App, Descriptions, Modal, Tag } from 'antd';
import http from '@/api/http';

const STATUS: Record<number, { label: string; color?: string }> = {
  1: { label: '完成', color: 'green' },
  2: { label: '已取消' },
  3: { label: '已退款', color: 'red' },
};

export default function NftOrders() {
  const { message } = App.useApp();
  const showDetail = (r: any) => {
    Modal.info({
      title: `NFT 订单 ${r.orderNo}`,
      width: 620,
      content: (
        <Descriptions size="small" bordered column={1}>
          <Descriptions.Item label="订单号">{r.orderNo}</Descriptions.Item>
          <Descriptions.Item label="NFT ID">{r.itemId}</Descriptions.Item>
          <Descriptions.Item label="买家ID">{r.buyerId}</Descriptions.Item>
          <Descriptions.Item label="卖家ID">{r.sellerId ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="价格">{r.price} {r.coin}</Descriptions.Item>
          <Descriptions.Item label="状态">{STATUS[r.status]?.label ?? '完成'}</Descriptions.Item>
          <Descriptions.Item label="备注">{r.remark ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="时间">{r.createdAt}</Descriptions.Item>
        </Descriptions>
      ),
    });
  };

  const setStatus = async (r: any, status: number, reload: () => void) => {
    await http.post(`/admin/ops/nft-order/${r.id}/status`, { status, reason: `后台标记为${STATUS[status].label}` });
    message.success('已更新状态');
    reload();
  };

  return (
    <AdminDataPage<any>
      url="/admin/ops/nft-order/page"
      exportable
      deleteUrl={(r) => `/admin/ops/nft-order/${r.id}/delete`}
      deletePermission="ops:nft"
      actions={[
        { label: '详情', onClick: (r) => showDetail(r) },
        {
          label: '取消',
          hidden: (r) => r.status === 2,
          confirm: '确认标记为已取消？',
          onClick: (r, { reload }) => setStatus(r, 2, reload),
        },
        {
          label: '退款',
          danger: true,
          hidden: (r) => r.status === 3,
          confirm: '确认标记为已退款？此操作只更新后台订单状态，不自动回滚资金。',
          onClick: (r, { reload }) => setStatus(r, 3, reload),
        },
        {
          label: '完成',
          hidden: (r) => r.status === 1 || r.status == null,
          onClick: (r, { reload }) => setStatus(r, 1, reload),
        },
      ]}
      filters={[
        { name: 'buyerId', label: '买家ID', type: 'number' },
        { name: 'sellerId', label: '卖家ID', type: 'number' },
        { name: 'status', label: '状态', type: 'select', options: Object.entries(STATUS).map(([value, item]) => ({ value: Number(value), label: item.label })) },
      ]}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '订单号', dataIndex: 'orderNo', width: 200 },
        { title: 'NFT ID', dataIndex: 'itemId', width: 100 },
        { title: '买家ID', dataIndex: 'buyerId', width: 100 },
        { title: '卖家ID', dataIndex: 'sellerId', width: 100 },
        { title: '价格', dataIndex: 'price', width: 140 },
        { title: '币种', dataIndex: 'coin', width: 100 },
        { title: '状态', dataIndex: 'status', width: 100, render: (v) => <Tag color={STATUS[v]?.color}>{STATUS[v]?.label ?? '完成'}</Tag> },
        { title: '备注', dataIndex: 'remark', width: 160 },
        { title: '时间', dataIndex: 'createdAt', width: 180 },
      ]}
    />
  );
}
