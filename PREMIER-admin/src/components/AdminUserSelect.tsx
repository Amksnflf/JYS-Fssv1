import { useEffect, useMemo, useRef, useState } from 'react';
import { Select, Space, Tag } from 'antd';
import type { SelectProps } from 'antd';
import http from '@/api/http';

interface PageResp<T> {
  records: T[];
}

export interface AdminUserOption {
  id: number;
  uid?: string;
  account?: string;
  nickname?: string;
  email?: string;
  phone?: string;
}

type Props = Omit<SelectProps<number>, 'options' | 'onSearch' | 'showSearch' | 'filterOption'>;

export default function AdminUserSelect(props: Props) {
  const [users, setUsers] = useState<AdminUserOption[]>([]);
  const [fetching, setFetching] = useState(false);
  const loadedUserIds = useRef(new Set<number>());

  const fetchUsers = async (keyword?: string) => {
    setFetching(true);
    try {
      const page = await http.get<PageResp<AdminUserOption>, PageResp<AdminUserOption>>('/admin/user/page', {
        params: { keyword, pageNo: 1, pageSize: 20 },
      });
      setUsers(page?.records ?? []);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!props.value) return;
    const exists = users.some((u) => u.id === props.value);
    if (exists) return;
    if (loadedUserIds.current.has(props.value)) return;
    loadedUserIds.current.add(props.value);
    http
      .get<AdminUserOption, AdminUserOption>(`/admin/user/${props.value}`)
      .then((u) => u && setUsers((prev) => [u, ...prev.filter((item) => item.id !== u.id)]))
      .catch(() => loadedUserIds.current.delete(props.value!));
  }, [props.value, users]);

  const options = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: userLabel(u),
        user: u,
      })),
    [users]
  );

  return (
    <Select<number>
      allowClear
      showSearch
      filterOption={false}
      placeholder="搜索 UID/账号/邮箱/手机"
      style={{ width: 260 }}
      {...props}
      loading={fetching}
      options={options}
      optionRender={(option) => {
        const u = option.data.user as AdminUserOption;
        return (
          <Space size={6} wrap>
            <Tag>{u.uid ?? `ID ${u.id}`}</Tag>
            <span>{u.account || u.nickname || u.phone || u.email || `用户 ${u.id}`}</span>
            {u.phone ? <span style={{ color: '#999' }}>{u.phone}</span> : null}
            {u.email ? <span style={{ color: '#999' }}>{u.email}</span> : null}
          </Space>
        );
      }}
      onFocus={(event) => {
        props.onFocus?.(event);
        if (!users.length) fetchUsers();
      }}
      onSearch={fetchUsers}
    />
  );
}

function userLabel(user: AdminUserOption) {
  const name = user.account || user.nickname || user.phone || user.email || `用户 ${user.id}`;
  return `${user.uid ?? `ID ${user.id}`} ${name}`;
}
