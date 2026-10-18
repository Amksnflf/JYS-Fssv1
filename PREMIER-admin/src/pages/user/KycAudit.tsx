import { useState } from 'react';
import { Button, Image, Modal, Select, Space, Table, Tag, App, Form, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { usePage } from '@/utils/usePage';
import http from '@/api/http';
import { exportCsv } from '@/utils/exportCsv';

interface Kyc {
  id: number;
  userId: number;
  level: number;
  realName?: string;
  idType?: string;
  idNo?: string;
  idFrontUrl?: string;
  idBackUrl?: string;
  faceUrl?: string;
  auditStatus: number;
  auditRemark?: string;
  createdAt: string;
}

export default function KycAuditPage() {
  const { data, total, pageNo, pageSize, loading, setPageNo, setPageSize, setExtraParams, reload } =
    usePage<Kyc>('/admin/user/kyc/page', { auditStatus: 0 });
  const [auditStatus, setAuditStatus] = useState<number | undefined>(0);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Kyc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();
  const nav = useNavigate();
  const [form] = Form.useForm();

  const submit = async (v: { pass: boolean; remark?: string }) => {
    if (!picked) return;
    if (v.pass === false && !v.remark?.trim()) {
      message.warning('驳回 KYC 必须填写备注');
      return;
    }
    setSubmitting(true);
    try {
      await http.post(`/admin/user/kyc/${picked.id}/audit`, { ...v, remark: v.remark?.trim() });
      message.success('已审核');
      setOpen(false);
      reload();
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '用户ID', dataIndex: 'userId', width: 100 },
    { title: '等级', dataIndex: 'level', width: 70 },
    { title: '姓名', dataIndex: 'realName', width: 120 },
    { title: '证件类型', dataIndex: 'idType', width: 100 },
    { title: '证件号', dataIndex: 'idNo', width: 200 },
    {
      title: '状态',
      dataIndex: 'auditStatus',
      width: 90,
      render: (s: number) =>
        s === 1 ? <Tag color="green">通过</Tag> : s === 2 ? <Tag color="red">驳回</Tag> : <Tag>待审</Tag>,
    },
    { title: '提交时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      width: 220,
      render: (_: unknown, k: Kyc) => (
        <Space className="admin-actions">
          <a onClick={() => { setPicked(k); setOpen(true); form.resetFields(); }}>查看/审核</a>
          <a onClick={() => nav(`/users?keyword=${k.userId}`)}>用户</a>
          {k.idNo && <a onClick={() => navigator.clipboard?.writeText(k.idNo!).then(() => message.success('证件号已复制'))}>复制证件</a>}
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">User</div>
          <h1 className="admin-page-title">KYC 审核</h1>
          <p className="admin-page-desc">集中处理实名资料、证件图片和审核备注，保障用户认证流程清晰可追溯。</p>
        </div>
      </div>
      <div className="admin-filter-panel">
      <Space wrap>
        <Select
          value={auditStatus}
          onChange={(v) => {
            setAuditStatus(v);
            setPageNo(1);
            setExtraParams({ auditStatus: v });
          }}
          allowClear
          style={{ width: 140 }}
          placeholder="审核状态"
          options={[
            { value: 0, label: '待审' },
            { value: 1, label: '通过' },
            { value: 2, label: '驳回' },
          ]}
        />
        <Button onClick={() => { exportCsv('KYC审核', data, columns); message.success('已导出当前页数据'); }}>导出当前页</Button>
      </Space>
      </div>

      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">认证申请</div>
            <div className="admin-table-meta">共 {total} 条记录</div>
          </div>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          pagination={{ current: pageNo, pageSize, total, showSizeChanger: true, onChange: (p, ps) => { setPageNo(p); setPageSize(ps); } }}
          columns={columns}
        />
      </div>

      <Modal
        open={open}
        title={`KYC 审核 #${picked?.id}`}
        width={720}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose
      >
        {picked && (
          <div className="admin-modal-form">
            <p>
              用户：{picked.userId} · 姓名：{picked.realName} · 证件：{picked.idType} {picked.idNo}
            </p>
            <Space size="large" wrap style={{ marginBottom: 12 }}>
              {picked.idFrontUrl && <Image src={picked.idFrontUrl} width={200} alt="正面" />}
              {picked.idBackUrl && <Image src={picked.idBackUrl} width={200} alt="背面" />}
              {picked.faceUrl && <Image src={picked.faceUrl} width={200} alt="人脸" />}
            </Space>
            {picked.auditStatus === 0 ? (
              <Form form={form} layout="vertical" onFinish={submit}>
                <Form.Item name="pass" hidden>
                  <Input />
                </Form.Item>
                <Form.Item name="remark" label="备注">
                  <Input.TextArea rows={2} placeholder="通过可选，驳回必填" />
                </Form.Item>
                <Space>
                  <Button type="primary" loading={submitting} onClick={() => form.setFieldsValue({ pass: true })} htmlType="submit">
                    通过
                  </Button>
                  <Button danger loading={submitting} onClick={() => form.setFieldsValue({ pass: false })} htmlType="submit">
                    驳回
                  </Button>
                </Space>
              </Form>
            ) : (
              <p>已审核：{picked.auditRemark}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
