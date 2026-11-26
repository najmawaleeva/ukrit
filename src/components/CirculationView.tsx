import { useMemo, useState } from 'react';
import { BellRing, CalendarPlus, CheckCircle2, Plus, Search } from 'lucide-react';
import type { EnrichedLoan, NotificationChannel } from '../types/library';
import { formatDateId, formatRupiah } from '../utils/formatters';

interface CirculationViewProps {
  loans: EnrichedLoan[];
  onOpenBorrowModal: () => void;
  onReturnLoan: (loanId: string) => Promise<void>;
  onExtendLoan: (loanId: string, days: number) => Promise<void>;
  onSendManualReminder: (loanId: string, channel?: NotificationChannel) => Promise<void>;
}

type FilterStatus = 'Semua' | 'Dipinjam' | 'Jatuh Tempo' | 'Terlambat' | 'Dikembalikan';

export function CirculationView({
  loans,
  onOpenBorrowModal,
  onReturnLoan,
  onExtendLoan,
  onSendManualReminder,
}: CirculationViewProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Semua');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  const filteredLoans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return loans.filter((loan) => {
      if (filterStatus === 'Dipinjam' && (loan.returnedAt || loan.status === 'Terlambat')) {
        return false;
      }
      if (filterStatus === 'Jatuh Tempo' && (loan.returnedAt || loan.daysRemaining > 1 || loan.daysRemaining < 0)) {
        return false;
      }
      if (filterStatus === 'Terlambat' && (loan.returnedAt || loan.status !== 'Terlambat')) {
        return false;
      }
      if (filterStatus === 'Dikembalikan' && !loan.returnedAt) {
        return false;
      }
      if (!q) return true;
      return (
        loan.loanCode.toLowerCase().includes(q) ||
        loan.memberName.toLowerCase().includes(q) ||
        loan.memberCode.toLowerCase().includes(q) ||
        loan.bookTitle.toLowerCase().includes(q)
      );
    });
  }, [loans, filterStatus, search]);

  const handleReturn = async (loan: EnrichedLoan) => {
    setBusyId(loan.id);
    setFeedback('');
    try {
      await onReturnLoan(loan.id);
      setFeedback(`Pengembalian "${loan.bookTitle}" oleh ${loan.memberName} berhasil dicatat.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleExtend = async (loan: EnrichedLoan) => {
    setBusyId(loan.id);
    setFeedback('');
    try {
      await onExtendLoan(loan.id, 7);
      setFeedback(`Masa pinjam "${loan.bookTitle}" diperpanjang 7 hari.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleRemind = async (loan: EnrichedLoan) => {
    setBusyId(loan.id);
    setFeedback('');
    try {
      await onSendManualReminder(loan.id, loan.preferredChannel);
      setFeedback(
        `Pengingat ${loan.preferredChannel} untuk ${loan.memberName} telah dicatat & siap dikirim.`
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Sirkulasi & Peminjaman Buku
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Kelola buku yang sedang dipinjam, proses pengembalian, perpanjangan, dan pengingat anggota.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenBorrowModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#25537A] rounded-lg hover:bg-[#1D4466] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Catat Peminjaman
        </button>
      </div>

      {feedback && (
        <div className="bg-[#EEF4F9] border border-[#C5D8E8] text-[#1D4466] text-xs font-medium px-4 py-3 rounded-xl">
          {feedback}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {(['Semua', 'Dipinjam', 'Jatuh Tempo', 'Terlambat', 'Dikembalikan'] as FilterStatus[]).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterStatus(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filterStatus === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode pinjam, anggota, buku..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
          />
        </div>
      </div>

      {/* Circulation Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredLoans.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-900">Tidak ada transaksi sirkulasi</p>
            <p className="text-xs text-slate-500 mt-1">
              Data peminjaman sesuai filter yang dipilih akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Anggota</th>
                  <th className="py-3 px-4">Judul Buku</th>
                  <th className="py-3 px-4">Tanggal Pinjam</th>
                  <th className="py-3 px-4">Jatuh Tempo</th>
                  <th className="py-3 px-4">Status & Denda</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.map((loan) => {
                  const isBusy = busyId === loan.id;
                  const isReturned = Boolean(loan.returnedAt);

                  let statusLabel = 'Aktif';
                  let statusClass = 'text-[#25537A] font-medium';
                  if (isReturned) {
                    statusLabel = 'Dikembalikan';
                    statusClass = 'text-[#16A34A] font-medium';
                  } else if (loan.status === 'Terlambat') {
                    statusLabel = `Terlambat ${Math.abs(loan.daysRemaining)} hr`;
                    statusClass = 'text-[#DC2626] font-semibold';
                  } else if (loan.daysRemaining === 0) {
                    statusLabel = 'Jatuh Tempo Hari Ini';
                    statusClass = 'text-[#D97706] font-semibold';
                  } else if (loan.daysRemaining === 1) {
                    statusLabel = 'Besok (H-1)';
                    statusClass = 'text-[#D97706] font-medium';
                  } else {
                    statusLabel = `Sisa ${loan.daysRemaining} hari`;
                  }

                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {loan.loanCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{loan.memberName}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {loan.memberCode} · {loan.preferredChannel}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div className="font-medium text-slate-900 truncate">{loan.bookTitle}</div>
                        <div className="text-xs text-slate-500 truncate">{loan.bookAuthor}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {formatDateId(loan.borrowedAt)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {formatDateId(loan.dueAt)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className={`text-xs tabular-nums ${statusClass}`}>{statusLabel}</div>
                        {loan.fineAmount > 0 && (
                          <div className="text-xs text-[#DC2626] font-mono tabular-nums mt-0.5">
                            Denda {formatRupiah(loan.fineAmount)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isReturned ? (
                          <span className="text-xs text-slate-400 tabular-nums">
                            Kembali {formatDateId(loan.returnedAt)}
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRemind(loan)}
                              title={`Kirim pengingat via ${loan.preferredChannel}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
                            >
                              <BellRing className="w-3.5 h-3.5" />
                              Ingatkan
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleExtend(loan)}
                              title="Perpanjang 7 hari"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" />
                              +7 Hr
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleReturn(loan)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[#16A34A] rounded-md hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Kembali
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
