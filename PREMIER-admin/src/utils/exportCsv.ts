import type { ColumnsType, ColumnType } from 'antd/es/table';

export function exportCsv<T>(fileName: string, rows: T[], columns: ColumnsType<T>) {
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
  const blob = new Blob([`\uFEFF${[header, ...body].join('\n')}`], { type: 'text/csv;charset=utf-8;' });
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
