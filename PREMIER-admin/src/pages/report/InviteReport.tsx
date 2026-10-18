import { useEffect, useState } from 'react';
import { App, Button, Card, Col, InputNumber, Row, Space, Statistic, Table, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePage } from '@/utils/usePage';
import http from '@/api/http';
import { exportCsv } from '@/utils/exportCsv';

interface InviteRow {
  id: number;
  userId: number;
  userUid?: string;
  userNickname?: string;
  parentId: number;
  parentUid?: string;
  parentNickname?: string;
  level: number;
  createdAt: string;
}

interface InviteStats {
  totalRelations: number;
  level1: number;
  level2: number;
  level3: number;
}

export default function InviteReportPage() {
  const { data, total, pageNo, pageSize, loading, setPageNo, setPageSize, setExtraParams } =
    usePage<InviteRow>('/admin/invite/relation/page');
  const [searchParams] = useSearchParams();
  const initialParentId = searchParams.get('parentId') ? Number(searchParams.get('parentId')) : undefined;
  const [parentId, setParentId] = useState<number | undefined>(initialParentId);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const nav = useNavigate();
  const { message } = App.useApp();

  const loadStats = async (pid?: number) => {
    const s = await http.get<InviteStats, InviteStats>('/admin/invite/stats', { params: { parentId: pid } });
    setStats(s);
  };

  useEffect(() => {
    loadStats(initialParentId);
  }, []);

  const query = () => {
    setPageNo(1);
    setExtraParams({ parentId });
    loadStats(parentId);
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '被邀请用户ID', dataIndex: 'userId', width: 120 },
    { title: '被邀请 UID', dataIndex: 'userUid', width: 120 },
    { title: '被邀请昵称', dataIndex: 'userNickname', width: 140 },
    { title: '上级用户ID', dataIndex: 'parentId', width: 120 },
    { title: '上级 UID', dataIndex: 'parentUid', width: 120 },
    { title: '上级昵称', dataIndex: 'parentNickname', width: 140 },
    { title: '层级', dataIndex: 'level', width: 80, render: (v: number) => <Tag color={v === 1 ? 'green' : v === 2 ? 'blue' : 'purple'}>{v} 级</Tag> },
    { title: '建立时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      width: 180,
      render: (_: unknown, r: InviteRow) => (
        <Space className="admin-actions">
          <a onClick={() => nav(`/users?keyword=${r.userUid ?? r.userId}`)}>被邀请用户</a>
          <a onClick={() => nav(`/users?keyword=${r.parentUid ?? r.parentId}`)}>上级用户</a>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Report</div>
          <h1 className="admin-page-title">邀请报表</h1>
          <p className="admin-page-desc">查看邀请层级关系和统计概览，支持按上级用户过滤关系链。</p>
        </div>
      </div>
      <div className="admin-filter-panel">
      <Space wrap>
        <InputNumber placeholder="上级用户 ID" value={parentId} onChange={(v) => setParentId(v ? Number(v) : undefined)} />
        <Button type="primary" onClick={query}>查询</Button>
        <Button onClick={() => { exportCsv('邀请报表', data, columns); message.success('已导出当前页数据'); }}>导出当前页</Button>
      </Space>
      </div>

      {stats && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}><Card className="admin-stat-card"><Statistic title="邀请关系总数" value={stats.totalRelations} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card className="admin-stat-card"><Statistic title="一级邀请" value={stats.level1} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card className="admin-stat-card"><Statistic title="二级邀请" value={stats.level2} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card className="admin-stat-card"><Statistic title="三级邀请" value={stats.level3} /></Card></Col>
        </Row>
      )}

      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">邀请关系</div>
            <div className="admin-table-meta">共 {total} 条记录</div>
          </div>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          pagination={{ current: pageNo, pageSize, total, showSizeChanger: true, onChange: (p, ps) => { setPageNo(p); setPageSize(ps); } }}
          columns={columns}
          scroll={{ x: 1400 }}
        />
      </div>
    </div>
  );
}
