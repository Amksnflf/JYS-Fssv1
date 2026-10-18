import { useEffect, useState, type ReactNode } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Upload } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import http from '@/api/http';
import { usePage } from '@/utils/usePage';
import { useAdminStore } from '@/store/adminStore';
import { hasPermission } from '@/utils/permission';
import AdminUserSelect from '@/components/AdminUserSelect';
import CoinSelect from '@/components/CoinSelect';
import SymbolSelect from '@/components/SymbolSelect';

type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'userSelect' | 'coinSelect' | 'symbolSelect' | 'imageUpload';

export interface FilterField {
  name: string;
  label: string;
  type?: FieldType;
  options?: { value: string | number; label: string }[];
  tradeType?: string;
  uploadBiz?: string;
  previewShape?: 'circle' | 'square';
  hint?: string;
}

export interface EditField extends FilterField {
  required?: boolean;
}

export interface RowAction<T> {
  label: string;
  permission?: string;
  danger?: boolean;
  confirm?: string | ((record: T) => string);
  hidden?: (record: T) => boolean;
  disabled?: (record: T) => boolean;
  onClick: (record: T, helpers: { reload: () => void }) => void | Promise<void>;
}

interface Props<T extends { id?: number | string }> {
  title?: string;
  description?: string;
  beforeTable?: ReactNode;
  url: string;
  columns: ColumnsType<T>;
  filters?: FilterField[];
  saveUrl?: string;
  deleteUrl?: (record: T) => string;
  deletePermission?: string;
  editFields?: EditField[];
  initialValues?: Record<string, unknown>;
  beforeSave?: (values: Record<string, unknown>) => Record<string, unknown>;
  actions?: RowAction<T>[];
  exportable?: boolean;
  exportFileName?: string;
}

export default function AdminDataPage<T extends { id?: number | string }>(props: Props<T>) {
  const { message } = App.useApp();
  const admin = useAdminStore((s) => s.admin);
  const [filterForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, total, pageNo, pageSize, loading, error, reload, setPageNo, setPageSize, setExtraParams, extraParams } =
    usePage<T>(props.url);

  useEffect(() => {
    filterForm.setFieldsValue(extraParams);
  }, [extraParams, filterForm]);

  const query = async () => {
    setPageNo(1);
    setExtraParams(filterForm.getFieldsValue());
  };

  const edit = (record?: T) => {
    editForm.resetFields();
    editForm.setFieldsValue({ ...props.initialValues, ...(record ?? {}) });
    setOpen(true);
  };

  const save = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const body = props.beforeSave ? props.beforeSave(values) : values;
      await http.post(props.saveUrl!, body);
      message.success('已保存');
      setOpen(false);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: T) => {
    if (!props.deleteUrl) return;
    await http.post(props.deleteUrl(record), { reason: '后台删除' });
    message.success('已删除');
    reload();
  };

  const exportRows = () => {
    exportTableData(props.exportFileName ?? props.title ?? '后台列表', data, props.columns);
    message.success('已导出当前页数据');
  };

  const visibleActions = (record: T) =>
    (props.actions ?? []).filter((action) =>
      hasPermission(admin?.permissions, action.permission) && !action.hidden?.(record)
    );

  const columns = [...props.columns];
  if (props.saveUrl || props.deleteUrl || props.actions?.length) {
    columns.push({
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_, record) => {
        const actions = visibleActions(record);
        return (
          <Space className="admin-actions">
            {props.saveUrl && <a onClick={() => edit(record)}>编辑</a>}
            {actions.map((action) => {
              const link = (
                <a
                  key={action.label}
                  className={action.danger ? 'admin-danger-link' : undefined}
                  onClick={action.confirm || action.disabled?.(record) ? undefined : () => action.onClick(record, { reload })}
                >
                  {action.label}
                </a>
              );
              if (!action.confirm) return link;
              const title = typeof action.confirm === 'function' ? action.confirm(record) : action.confirm;
              return (
                <Popconfirm
                  key={action.label}
                  title={title}
                  okText="确认"
                  cancelText="取消"
                  disabled={action.disabled?.(record)}
                  onConfirm={() => action.onClick(record, { reload })}
                >
                  {link}
                </Popconfirm>
              );
            })}
            {props.deleteUrl && props.deletePermission && hasPermission(admin?.permissions, props.deletePermission) && (
              <Popconfirm title="确认删除？" okText="删除" cancelText="取消" onConfirm={() => remove(record)}>
                <a className="admin-danger-link">删除</a>
              </Popconfirm>
            )}
          </Space>
        );
      },
    });
  }

  return (
    <div className="admin-data-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Management</div>
          <h1 className="admin-page-title">{props.title ?? '后台列表'}</h1>
          <p className="admin-page-desc">{props.description ?? '支持快速筛选、分页查看和批量业务操作，请在操作前核对关键字段。'}</p>
        </div>
      </div>

      {props.beforeTable}

      {props.filters?.length ? (
        <div className="admin-filter-panel">
          <Form form={filterForm} layout="inline" className="admin-filter-form">
            {props.filters.map((f) => (
              <Form.Item key={f.name} name={f.name} label={f.label}>
                {renderField(f)}
              </Form.Item>
            ))}
            <Form.Item>
              <Space>
                <Button type="primary" onClick={query}>查询</Button>
                <Button onClick={() => { filterForm.resetFields(); setExtraParams({}); setPageNo(1); }}>重置</Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      ) : null}

      {(props.saveUrl || props.exportable) && (
        <div className="admin-toolbar">
          <div className="admin-toolbar-left" />
          <div className="admin-toolbar-right">
            {props.exportable && <Button onClick={exportRows}>导出当前页</Button>}
            {props.saveUrl && (
              <Button type="primary" onClick={() => edit()}>
                新增
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">数据列表</div>
            <div className="admin-table-meta">共 {total} 条记录</div>
          </div>
        </div>
        {error && (
          <Alert
            type="error"
            showIcon
            message="数据加载失败"
            description={error}
            action={<Button size="small" onClick={reload}>重试</Button>}
            style={{ marginBottom: 12 }}
          />
        )}
        <Table
          rowKey={(r) => String(r.id)}
          loading={loading}
          dataSource={data}
          columns={columns}
          pagination={{ current: pageNo, pageSize, total, showSizeChanger: true, onChange: (p, ps) => { setPageNo(p); setPageSize(ps); } }}
          scroll={{ x: 1400 }}
        />
      </div>

      {props.saveUrl && (
        <Modal
          title={props.title ?? '编辑'}
          open={open}
          confirmLoading={saving}
          onCancel={() => setOpen(false)}
          onOk={() => editForm.submit()}
          destroyOnClose
        >
          <Form form={editForm} layout="vertical" onFinish={save} className="admin-modal-form">
            <Form.Item name="id" hidden><Input /></Form.Item>
            {props.editFields?.map((f) => (
              <Form.Item key={f.name} name={f.name} label={f.label} rules={f.required ? [{ required: true }] : undefined}>
                {renderField(f)}
              </Form.Item>
            ))}
          </Form>
        </Modal>
      )}
    </div>
  );
}

function renderField(field: FilterField) {
  if (field.type === 'userSelect') return <AdminUserSelect />;
  if (field.type === 'coinSelect') return <CoinSelect />;
  if (field.type === 'symbolSelect') return <SymbolSelect tradeType={field.tradeType} />;
  if (field.type === 'imageUpload') return <ImageUploadField field={field} />;
  if (field.type === 'number') return <InputNumber style={{ width: 180 }} />;
  if (field.type === 'textarea') return <Input.TextArea rows={4} />;
  if (field.type === 'select') return <Select allowClear style={{ width: 180 }} options={field.options ?? []} />;
  return <Input style={{ width: 200 }} />;
}

function exportTableData<T>(fileName: string, rows: T[], columns: ColumnsType<T>) {
  const usableColumns = columns.filter((c): c is ColumnType<T> => {
    const dataIndex = (c as ColumnType<T>).dataIndex;
    return Boolean(c.title && dataIndex && typeof dataIndex === 'string');
  });
  const header = usableColumns.map((c) => csvCell(String(c.title))).join(',');
  const body = rows.map((row) =>
    usableColumns
      .map((c) => csvCell(String((row as Record<string, unknown>)[c.dataIndex as string] ?? '')))
      .join(',')
  );
  const csv = [header, ...body].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

interface UploadResult {
  path?: string;
  url?: string;
}

function ImageUploadField({ field }: { field: FilterField }) {
  const { message } = App.useApp();
  const form = Form.useFormInstance<Record<string, string | undefined>>();
  const value = Form.useWatch(field.name, form);
  const [uploading, setUploading] = useState(false);
  const imageUrl = resolveImageUrl(value);
  const isCircle = (field.previewShape ?? 'square') === 'circle';

  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const formData = new FormData();
    formData.append('file', options.file as Blob);
    formData.append('biz', field.uploadBiz ?? 'coin');
    setUploading(true);
    try {
      const result = await http.post<UploadResult, UploadResult>('/admin/upload/image', formData);
      form.setFieldsValue({ [field.name]: resolveUploadedPath(result) });
      message.success(`${field.label}上传成功`);
      options.onSuccess?.(result as never);
    } catch (error) {
      options.onError?.(error as Error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Space align="start" wrap>
      <ImagePreview imageUrl={imageUrl} shape={isCircle ? 'circle' : 'square'} />
      <Space direction="vertical" size={6}>
        <Upload accept="image/*" showUploadList={false} customRequest={handleUpload} disabled={uploading}>
          <Button icon={<UploadOutlined />} loading={uploading}>
            {value ? `更换${field.label}` : `点击上传${field.label}`}
          </Button>
        </Upload>
        <Button onClick={() => form.setFieldsValue({ [field.name]: undefined })} disabled={!value}>
          清空{field.label}
        </Button>
        <span style={{ color: '#999', fontSize: 12 }}>
          {field.hint ?? '上传后将保存为本地图片相对路径，并按后台图片规则回显。'}
        </span>
      </Space>
    </Space>
  );
}

function ImagePreview({ imageUrl, shape }: { imageUrl: string; shape: 'circle' | 'square' }) {
  const size = shape === 'circle' ? 72 : 96;
  if (!imageUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: shape === 'circle' ? '50%' : 12,
          background: '#f3f4f6',
          color: '#9ca3af',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          overflow: 'hidden',
        }}
      >
        暂无图片
      </div>
    );
  }
  return (
    <img
      src={imageUrl}
      alt=""
      style={{
        width: size,
        height: size,
        borderRadius: shape === 'circle' ? '50%' : 12,
        objectFit: 'cover',
        display: 'block',
        border: '1px solid #f0f0f0',
      }}
    />
  );
}

function resolveImageUrl(value?: string) {
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;
  const normalized = normalizeUploadPath(value);
  if (normalized.startsWith('/uploads/')) return `/api${normalized}`;
  return normalized;
}

function resolveUploadedPath(result: UploadResult) {
  return result.path?.trim() || result.url?.trim() || '';
}

function normalizeUploadPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/api/uploads/')) return trimmed;
  if (trimmed.startsWith('api/uploads/')) return `/${trimmed}`;
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;

  const apiUploadsIndex = trimmed.indexOf('/api/uploads/');
  if (apiUploadsIndex >= 0) return trimmed.slice(apiUploadsIndex);

  const uploadsIndex = trimmed.indexOf('/uploads/');
  if (uploadsIndex >= 0) return trimmed.slice(uploadsIndex);

  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
