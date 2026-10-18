import { Tag } from 'antd';
import AdminDataPage from '@/components/AdminDataPage';

const MODES = [
  { value: 'MANUAL', label: '普通充值' },
  { value: 'UDUN', label: '优盾充值' },
  { value: 'BOTH', label: '两者都开' },
];

export default function DepositChannels() {
  return (
    <AdminDataPage<any>
      title="充值通道配置"
      url="/admin/asset/deposit-channel/page"
      saveUrl="/admin/asset/deposit-channel/save"
      exportable
      filters={[
        { name: 'coin', label: '币种' },
        { name: 'chain', label: '链' },
        { name: 'mode', label: '模式', type: 'select', options: MODES },
      ]}
      editFields={[
        { name: 'coin', label: '币种（留空为全局）' },
        { name: 'chain', label: '链（留空为币种/全局）' },
        { name: 'mode', label: '模式', type: 'select', required: true, options: MODES },
        { name: 'manualEnabled', label: '普通充值', type: 'select', options: [{ value: 1, label: '启用' }, { value: 0, label: '关闭' }] },
        { name: 'udunEnabled', label: '优盾充值', type: 'select', options: [{ value: 1, label: '启用' }, { value: 0, label: '关闭' }] },
        { name: 'fallbackToManual', label: '优盾失败降级普通充值', type: 'select', options: [{ value: 1, label: '允许' }, { value: 0, label: '不允许' }] },
        { name: 'minAmount', label: '最小金额' },
        { name: 'maxAmount', label: '最大金额' },
        { name: 'enabled', label: '配置状态', type: 'select', options: [{ value: 1, label: '启用' }, { value: 0, label: '停用' }] },
      ]}
      initialValues={{ mode: 'MANUAL', manualEnabled: 1, udunEnabled: 0, fallbackToManual: 1, enabled: 1 }}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '币种', dataIndex: 'coin', width: 100, render: (v) => v || '全局' },
        { title: '链', dataIndex: 'chain', width: 120, render: (v) => v || '-' },
        { title: '模式', dataIndex: 'mode', width: 120, render: (v) => <Tag>{MODES.find((m) => m.value === v)?.label ?? v}</Tag> },
        { title: '普通', dataIndex: 'manualEnabled', width: 90, render: (v) => v === 1 ? <Tag color="green">启用</Tag> : <Tag>关闭</Tag> },
        { title: '优盾', dataIndex: 'udunEnabled', width: 90, render: (v) => v === 1 ? <Tag color="green">启用</Tag> : <Tag>关闭</Tag> },
        { title: '降级', dataIndex: 'fallbackToManual', width: 90, render: (v) => v === 1 ? <Tag color="blue">允许</Tag> : <Tag>不允许</Tag> },
        { title: '状态', dataIndex: 'enabled', width: 90, render: (v) => v === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag> },
        { title: '更新时间', dataIndex: 'updatedAt', width: 180 },
      ]}
    />
  );
}
