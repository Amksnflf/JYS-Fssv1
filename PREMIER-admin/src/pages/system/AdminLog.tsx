import { useState } from 'react';
import { Alert, App, Button, DatePicker, Input, InputNumber, Space, Table } from 'antd';
import type { Dayjs } from 'dayjs';
import { usePage } from '@/utils/usePage';
import { exportCsv } from '@/utils/exportCsv';

const { RangePicker } = DatePicker;

interface Log {
  id: number;
  adminId: number;
  module: string;
  action: string;
  targetType?: string;
  targetId?: string;
  params?: string;
  ip?: string;
  createdAt: string;
}

export default function AdminLogPage() {
  const { data, total, pageNo, pageSize, loading, error, reload, setPageNo, setPageSize, setExtraParams } =
    usePage<Log>('/admin/stats/admin-log/page');
  const [adminId, setAdminId] = useState<number | undefined>();
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [targetId, setTargetId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const { message } = App.useApp();
  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '管理员', dataIndex: 'adminId', width: 100 },
    { title: '模块', dataIndex: 'module', width: 100 },
    { title: '动作', dataIndex: 'action', width: 140 },
    { title: '对象类型', dataIndex: 'targetType', width: 120 },
    { title: '对象ID', dataIndex: 'targetId', width: 120 },
    { title: '参数', dataIndex: 'params', ellipsis: true },
    { title: 'IP', dataIndex: 'ip', width: 140 },
    { title: '时间', dataIndex: 'createdAt', width: 180 },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <InputNumber placeholder="管理员ID" value={adminId} onChange={(v) => setAdminId(v ?? undefined)} />
        <Input placeholder="模块" value={module} onChange={(e) => setModule(e.target.value)} style={{ width: 140 }} />
        <Input placeholder="动作" value={action} onChange={(e) => setAction(e.target.value)} style={{ width: 140 }} />
        <Input placeholder="对象ID" value={targetId} onChange={(e) => setTargetId(e.target.value)} style={{ width: 140 }} />
        <Input placeholder="关键词" value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ width: 160 }} />
        <RangePicker
          showTime
          value={range}
          onChange={(v) => setRange(v)}
        />
        <Button type="primary" onClick={() => {
          setPageNo(1);
          setExtraParams({
            adminId,
            module,
            action,
            targetId,
            keyword,
            startTime: range?.[0]?.toISOString(),
            endTime: range?.[1]?.toISOString(),
          });
        }}>
          查询
        </Button>
        <Button onClick={() => {
          setAdminId(undefined);
          setModule('');
          setAction('');
          setTargetId('');
          setKeyword('');
          setRange(null);
          setPageNo(1);
          setExtraParams({});
        }}>
          重置
        </Button>
        <Button onClick={() => { exportCsv('操作日志', data, columns); message.success('已导出当前页数据'); }}>
          导出当前页
        </Button>
      </Space>
      {error && (
        <Alert
          type="error"
          showIcon
          message="操作日志加载失败"
          description={error}
          action={<Button size="small" onClick={reload}>重试</Button>}
          style={{ marginBottom: 12 }}
        />
      )}
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ current: pageNo, pageSize, total, onChange: (p, ps) => { setPageNo(p); setPageSize(ps); } }}
        columns={columns}
      />
    </div>
  );
}
