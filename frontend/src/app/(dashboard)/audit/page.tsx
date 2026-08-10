'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Spinner } from '@/components/spinner';
import { api } from '@/lib/api';
import type { AuditLog, Paginated } from '@/lib/types';

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-rose-100 text-rose-700',
};

const PAGE_SIZE = 20;

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<Paginated<AuditLog>>(
      `/audit-logs?page=${page}&pageSize=${PAGE_SIZE}`,
    );
    setLogs(res.data);
    setTotal(res.total);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Every create, update and delete across the system, with the actor and outcome."
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Spinner className="h-4 w-4" />
          Loading…
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Entity</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Path</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{log.userEmail ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ACTION_STYLES[log.action] ?? 'bg-slate-100 text-slate-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">{log.entity}</td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-slate-500 md:table-cell">
                      {log.method} {log.path}
                    </td>
                    <td className="px-4 py-3">{log.statusCode}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                      No activity recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>
              Page {page} of {totalPages} · {total} entries
            </span>
            <div className="flex gap-2">
              <button
                className="btn-ghost !px-3 !py-1 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </button>
              <button
                className="btn-ghost !px-3 !py-1 disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
