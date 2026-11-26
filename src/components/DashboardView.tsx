import { useState } from 'react';
import { ArrowUpRight, BellRing, BookOpen, Clock, Users } from 'lucide-react';
import type { AnalyticsSnapshot, CirculationEvent, EnrichedLoan } from '../types/library';
import { formatDateId, formatRelativeId, formatRupiah } from '../utils/formatters';
import type { ActiveTab } from './Sidebar';

interface DashboardViewProps {
  analytics: AnalyticsSnapshot;
  events: CirculationEvent[];
  loans: EnrichedLoan[];
  streamConnected: boolean;
  onNavigate: (tab: ActiveTab) => void;
  onOpenBorrowModal: () => void;
}

export function DashboardView({
  analytics,
  events,
  loans,
  streamConnected,
  onNavigate,
  onOpenBorrowModal,
}: DashboardViewProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const maxTrendValue = Math.max(
    3,
    ...analytics.dailyTrend.map((d) => Math.max(d.borrowed, d.returned))
  );

  const urgentLoans = loans
    .filter((l) => !l.returnedAt && l.daysRemaining <= 1)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header summary strip */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Dashboard Analitik Sirkulasi
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Pemantauan aktivitas peminjaman, keterlambatan, dan pengiriman pengingat secara langsung.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              className={`w-2 h-2 rounded-full ${
                streamConnected ? 'bg-[#16A34A]' : 'bg-[#25537A]'
              }`}
              aria-hidden="true"
            />
            {streamConnected ? 'Sinkronisasi Real-Time Aktif' : 'Sinkronisasi Otomatis Aktif'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            Utilisasi Koleksi {analytics.utilizationRate}%
          </span>
        </div>
      </div>

      {/* 4-column flat KPI strip */}
      <section
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        aria-label="Ringkasan metrik perpustakaan"
      >
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Koleksi Buku</span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-slate-900">
            {analytics.totalCopies}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {analytics.totalTitles} judul · {analytics.availableCopies} eksemplar tersedia
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Sedang Dipinjam</span>
            <Clock className="w-4 h-4 text-[#25537A]" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-slate-900">
            {analytics.activeLoansCount}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {analytics.dueTodayCount} jatuh tempo hari ini · {analytics.dueTomorrowCount} besok (H-1)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Perlu Tindak Lanjut</span>
            <Users className="w-4 h-4 text-[#DC2626]" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-[#DC2626]">
            {analytics.overdueCount}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            Terlambat · Denda berjalan {formatRupiah(analytics.totalAccumulatedFines)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Notifikasi Pengingat</span>
            <BellRing className="w-4 h-4 text-[#16A34A]" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-slate-900">
            {analytics.notificationsSentCount}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            Ketepatan kembali {analytics.onTimeReturnRate}% · {analytics.activeMembersCount} anggota aktif
          </p>
        </div>
      </section>

      {/* Main Analytics Split: 7-Day Trend + Live Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 7-Day Circulation Chart */}
        <section className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Tren Sirkulasi 7 Hari Terakhir
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan transaksi peminjaman dan pengembalian harian
              </p>
            </div>
            <div className="flex items-center gap-5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#25537A]" aria-hidden="true" />
                Peminjaman
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#16A34A]" aria-hidden="true" />
                Pengembalian
              </span>
            </div>
          </div>

          <div className="mt-6 flex-1 min-h-[240px] flex flex-col justify-end">
            <div className="grid grid-cols-7 gap-3 items-end h-[200px] pt-6 border-b border-slate-200 pb-2">
              {analytics.dailyTrend.map((day) => {
                const borrowPct = Math.round((day.borrowed / maxTrendValue) * 100);
                const returnPct = Math.round((day.returned / maxTrendValue) * 100);
                const isHovered = hoveredDay === day.date;

                return (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoveredDay(day.date)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="relative flex flex-col items-center justify-end h-full group"
                  >
                    {isHovered && (
                      <div className="absolute -top-2 z-10 bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-sm tabular-nums">
                        {day.label}: {day.borrowed} pinjam · {day.returned} kembali
                      </div>
                    )}
                    <div className="w-full flex items-end justify-center gap-1.5 h-full px-1">
                      <div
                        className="w-3 sm:w-4 bg-[#25537A] rounded-t transition-opacity duration-150 group-hover:opacity-90"
                        style={{ height: `${Math.max(day.borrowed > 0 ? 10 : 3, borrowPct)}%` }}
                        title={`Dipinjam: ${day.borrowed}`}
                      />
                      <div
                        className="w-3 sm:w-4 bg-[#16A34A] rounded-t transition-opacity duration-150 group-hover:opacity-90"
                        style={{ height: `${Math.max(day.returned > 0 ? 10 : 3, returnPct)}%` }}
                        title={`Dikembalikan: ${day.returned}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7 gap-3 pt-2.5 text-center">
              {analytics.dailyTrend.map((day) => (
                <div key={day.date} className="text-xs text-slate-500 tabular-nums truncate">
                  {day.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live Activity Stream */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Aktivitas Langsung
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Log sirkulasi & notifikasi real-time</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('circulation')}
              className="text-xs font-medium text-[#25537A] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              Semua <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2 flex-1 overflow-y-auto max-h-[280px]">
            {events.length === 0 ? (
              <p className="py-8 text-sm text-slate-500 text-center">
                Belum ada aktivitas sirkulasi tercatat.
              </p>
            ) : (
              events.slice(0, 7).map((evt) => (
                <div key={evt.id} className="py-3 first:pt-2 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900">{evt.title}</span>
                    <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                      {formatRelativeId(evt.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{evt.detail}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Bottom Split: Urgent Due Reminders + Category Distribution & Top Books */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Urgent Loans Requiring Return Coordination */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Prioritas Pengembalian & Pengingat
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Peminjaman jatuh tempo H-1, hari ini, atau melewati batas waktu
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              className="text-xs font-medium text-[#25537A] hover:underline whitespace-nowrap shrink-0"
            >
              Kelola Notifikasi
            </button>
          </div>

          {urgentLoans.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-600">
                Seluruh peminjaman berada dalam jadwal aman.
              </p>
              <button
                type="button"
                onClick={onOpenBorrowModal}
                className="mt-3 px-4 py-2 text-xs font-medium text-white bg-[#25537A] rounded-lg hover:bg-[#1D4466] transition-colors"
              >
                Catat Peminjaman Baru
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 font-medium">
                    <th className="py-2.5 pr-3">Anggota</th>
                    <th className="py-2.5 px-3">Judul Buku</th>
                    <th className="py-2.5 px-3">Jatuh Tempo</th>
                    <th className="py-2.5 pl-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {urgentLoans.map((loan) => {
                    const statusText =
                      loan.daysRemaining < 0
                        ? `Terlambat ${Math.abs(loan.daysRemaining)} hr`
                        : loan.daysRemaining === 0
                          ? 'Jatuh Tempo Hari Ini'
                          : 'Besok (H-1)';
                    const statusColor =
                      loan.daysRemaining < 0
                        ? 'text-[#DC2626] font-semibold'
                        : loan.daysRemaining === 0
                          ? 'text-[#D97706] font-semibold'
                          : 'text-[#25537A] font-medium';

                    return (
                      <tr key={loan.id} className="hover:bg-slate-50/70">
                        <td className="py-3 pr-3">
                          <div className="font-medium text-slate-900">{loan.memberName}</div>
                          <div className="text-xs text-slate-500">{loan.preferredChannel}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 max-w-[200px] truncate">
                          {loan.bookTitle}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {formatDateId(loan.dueAt)}
                        </td>
                        <td className={`py-3 pl-3 text-xs text-right tabular-nums whitespace-nowrap ${statusColor}`}>
                          {statusText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Category Distribution & Popular Titles */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Distribusi Peminjaman per Kategori
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('catalog')}
                className="text-xs font-medium text-[#25537A] hover:underline whitespace-nowrap shrink-0"
              >
                Lihat Katalog
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {analytics.categoryDistribution.map((cat) => {
                const maxBorrow = Math.max(
                  1,
                  ...analytics.categoryDistribution.map((c) => c.borrowCount)
                );
                const widthPct = Math.round((cat.borrowCount / maxBorrow) * 100);
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{cat.category}</span>
                      <span className="text-slate-500 tabular-nums">
                        {cat.borrowCount} kali dipinjam · {cat.activeLoans} aktif
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#25537A] rounded-full"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 mb-3">
              Koleksi Paling Sering Dipinjam
            </h3>
            <div className="divide-y divide-slate-100">
              {analytics.topBooks.slice(0, 3).map((b, idx) => (
                <div key={b.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {idx + 1}. {b.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {b.author} · {b.category}
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-700 shrink-0">
                    {b.borrowCount}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
