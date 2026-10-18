import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import http from '@/api/http';

interface PageResp<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

export function usePage<T>(url: string, defaultParams: Record<string, unknown> = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const mountedRef = useRef(false);
  const initialParams = useMemo(() => {
    const searchParams = paramsFromSearch(window.location.search);
    return Object.keys(searchParams).length ? searchParams : cleanParams(defaultParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraParams, setExtraParams] = useState<Record<string, unknown>>(initialParams);
  const stableExtraParams = stableStringify(extraParams);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    http
      .get<PageResp<T>, PageResp<T>>(url, {
        params: cleanParams({ pageNo, pageSize, ...extraParams }),
      })
      .then((p) => {
        setData(p?.records ?? []);
        setTotal(p?.total ?? 0);
      })
      .catch((e) => {
        setData([]);
        setTotal(0);
        setError(e?.message || '数据加载失败');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, pageNo, pageSize, stableExtraParams]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setPageNo(1);
    setExtraParams(paramsFromSearch(location.search));
  }, [location.search]);

  const updateExtraParams = useCallback((params: Record<string, unknown>) => {
    const cleaned = cleanParams(params);
    setExtraParams(cleaned);
    const query = new URLSearchParams();
    Object.entries(cleaned).forEach(([key, value]) => query.set(key, String(value)));
    navigate(
      {
        pathname: location.pathname,
        search: query.toString() ? `?${query}` : '',
        hash: location.hash,
      },
      { replace: true }
    );
  }, [location.hash, location.pathname, navigate]);

  return {
    data,
    total,
    pageNo,
    pageSize,
    loading,
    error,
    reload,
    setPageNo,
    setPageSize,
    setExtraParams: updateExtraParams,
    extraParams,
  };
}

function paramsFromSearch(search: string) {
  return cleanParams(Object.fromEntries(new URLSearchParams(search).entries()));
}

function cleanParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function stableStringify(value: Record<string, unknown>) {
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = value[key];
        return acc;
      }, {})
  );
}
