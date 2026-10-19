import { Result, Spin } from 'antd';
import type React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';
import { hasPermission } from '@/utils/permission';

interface Props {
  permission?: string;
  children: React.ReactNode;
}

export default function PermissionRoute({ permission, children }: Props) {
  const admin = useAdminStore((s) => s.admin);
  const token = useAdminStore((s) => s.token);
  const authStatus = useAdminStore((s) => s.authStatus);
  if (token && !admin && authStatus !== 'error') {
    return (
      <div className="admin-panel" style={{ padding: 48, textAlign: 'center' }}>
        <Spin tip="正在校验管理员权限" />
      </div>
    );
  }
  if (!admin) {
    return <Navigate to="/login" replace />;
  }
  if (!hasPermission(admin.permissions, permission)) {
    return <Result status="403" title="403" subTitle="无权限访问该页面" />;
  }
  return <>{children}</>;
}
