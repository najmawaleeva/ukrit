import { useEffect, useState } from 'react';
import { ExternalLink, Mail, MessageSquare, Play, Save } from 'lucide-react';
import type {
  AnalyticsSnapshot,
  AutomationSettings,
  NotificationChannel,
  NotificationLog,
} from '../types/library';
import { buildMailtoUrl, buildWhatsappUrl, formatDateTimeId } from '../utils/formatters';

interface NotificationsViewProps {
  notifications: NotificationLog[];
  settings: AutomationSettings;
  providerStatus: AnalyticsSnapshot['providerStatus'];
  onUpdateSettings: (next: Partial<AutomationSettings>) => Promise<void>;
  onRunSweep: () => Promise<{ createdCount: number }>;
}

export function NotificationsView({
  notifications,
  settings,
  providerStatus,
  onUpdateSettings,
  onRunSweep,
}: NotificationsViewProps) {
  const [form, setForm] = useState<AutomationSettings>(settings);
  const [channelFilter, setChannelFilter] = useState<'Semua' | 'WhatsApp' | 'Email'>('Semua');
  const [saving, setSaving] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const filteredLogs = notifications.filter((log) => {
    if (channelFilter !== 'Semua' && log.channel !== channelFilter) return false;
    return true;
  });

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    try {
      await onUpdateSettings(form);
      setFeedback('Pengaturan otomasi pengingat berhasil disimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerSweep = async () => {
    setSweeping(true);
    setFeedback('');
    try {
      const result = await onRunSweep();
      setFeedback(
        result.createdCount > 0
          ? `Pengecekan selesai: ${result.createdCount} pengingat baru dibuat dan siap dikirim.`
          : 'Pengecekan selesai: seluruh peminjaman yang memenuhi syarat sudah menerima pengingat.'
      );
    } finally {
      setSweeping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Otomasi Notifikasi Email & WhatsApp
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Atur jadwal pengingat otomatis pengembalian buku dan pantau pengiriman ke anggota.
          </p>
        </div>
        <button
          type="button"
          onClick={handleTriggerSweep}
          disabled={sweeping}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#25537A] rounded-lg hover:bg-[#1D4466] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Play className="w-4 h-4" />
          {sweeping ? 'Memeriksa Jadwal...' : 'Jalankan Pengecekan Sekarang'}
        </button>
      </div>

      {feedback && (
        <div className="bg-[#EEF4F9] border border-[#C5D8E8] text-[#1D4466] text-xs font-medium px-4 py-3 rounded-xl">
          {feedback}
        </div>
      )}

      {/* Rules & Templates Split */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Automation Rules */}
        <form
          onSubmit={handleSaveSettings}
          className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="pb-3 border-b border-slate-100">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Aturan Penjadwalan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pengecekan latar belakang berjalan otomatis setiap 60 detik.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Gateway Email (Resend API)</span>
              <span
                className={`font-medium ${
                  providerStatus.emailConfigured ? 'text-[#16A34A]' : 'text-slate-500'
                }`}
              >
                {providerStatus.emailConfigured ? 'Terhubung' : 'Mode Mailto / Lokal'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Gateway WhatsApp Webhook</span>
              <span
                className={`font-medium ${
                  providerStatus.whatsappConfigured ? 'text-[#16A34A]' : 'text-slate-500'
                }`}
              >
                {providerStatus.whatsappConfigured ? 'Terhubung' : 'Mode WhatsApp Web / Lokal'}
              </span>
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
            <span className="text-sm font-medium text-slate-800">Aktifkan Pengingat Otomatis</span>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="w-4 h-4 accent-[#25537A]"
            />
          </label>

          <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
            <span className="text-sm text-slate-700">Kirim Pengingat di Hari Jatuh Tempo</span>
            <input
              type="checkbox"
              checked={form.remindOnDueDay}
              onChange={(e) => setForm({ ...form, remindOnDueDay: e.target.checked })}
              className="w-4 h-4 accent-[#25537A]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pengingat Sebelum Jatuh Tempo (Hari)
              </label>
              <input
                type="number"
                min={1}
                max={7}
                value={form.remindDaysBefore}
                onChange={(e) =>
                  setForm({ ...form, remindDaysBefore: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Interval Terlambat (Jam)
              </label>
              <input
                type="number"
                min={6}
                max={168}
                value={form.remindOverdueIntervalHours}
                onChange={(e) =>
                  setForm({ ...form, remindOverdueIntervalHours: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Denda Harian (Rp)
              </label>
              <input
                type="number"
                min={0}
                step={500}
                value={form.dailyFinePerDay}
                onChange={(e) =>
                  setForm({ ...form, dailyFinePerDay: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Kanal Utama Default
              </label>
              <select
                value={form.defaultChannel}
                onChange={(e) =>
                  setForm({ ...form, defaultChannel: e.target.value as NotificationChannel })
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#25537A]"
              >
                <option value="Keduanya">WhatsApp & Email</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Email">Email</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-[#25537A] rounded-lg hover:bg-[#1D4466] disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan & Template'}
            </button>
          </div>
        </form>

        {/* Message Templates */}
        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Template Pesan Pengingat
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gunakan variabel dinamis: {'{nama}'}, {'{judul_buku}'}, {'{tanggal_jatuh_tempo}'},{' '}
              {'{status_waktu}'}, {'{info_denda}'}.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Template Pesan WhatsApp
            </label>
            <textarea
              rows={3}
              value={form.whatsappTemplate}
              onChange={(e) => setForm({ ...form, whatsappTemplate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Subjek Email Pengingat
            </label>
            <input
              type="text"
              value={form.emailSubjectTemplate}
              onChange={(e) => setForm({ ...form, emailSubjectTemplate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Isi Email Pengingat
            </label>
            <textarea
              rows={5}
              value={form.emailBodyTemplate}
              onChange={(e) => setForm({ ...form, emailBodyTemplate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
            />
          </div>
        </div>
      </div>

      {/* Delivery Log Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Riwayat & Antrean Pengiriman
            </h2>
            <p className="text-xs text-slate-500">
              Klik kirim langsung untuk membuka pesan siap kirim di WhatsApp Web atau aplikasi Email.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {(['Semua', 'WhatsApp', 'Email'] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannelFilter(ch)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  channelFilter === ch
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-900">Belum ada riwayat notifikasi</p>
            <p className="text-xs text-slate-500 mt-1">
              Jalankan pengecekan otomatis atau kirim pengingat manual dari menu Sirkulasi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Penerima</th>
                  <th className="py-3 px-4">Kanal & Pemicu</th>
                  <th className="py-3 px-4">Cuplikan Pesan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Tindak Lanjut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const directHref =
                    log.channel === 'WhatsApp'
                      ? buildWhatsappUrl(log.recipient, log.message)
                      : buildMailtoUrl(log.recipient, log.subject, log.message);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {formatDateTimeId(log.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{log.memberName}</div>
                        <div className="text-xs font-mono text-slate-500">{log.recipient}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                          {log.channel === 'WhatsApp' ? (
                            <MessageSquare className="w-3.5 h-3.5 text-[#16A34A]" />
                          ) : (
                            <Mail className="w-3.5 h-3.5 text-[#25537A]" />
                          )}
                          {log.channel}
                        </div>
                        <div className="text-slate-500 mt-0.5">{log.triggerType}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="text-xs font-medium text-slate-800 truncate">
                          {log.bookTitle}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{log.message}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            log.deliveryStatus === 'Terkirim via Gateway'
                              ? 'text-[#16A34A]'
                              : log.deliveryStatus === 'Gagal'
                                ? 'text-[#DC2626]'
                                : 'text-[#25537A]'
                          }`}
                        >
                          {log.deliveryStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <a
                          href={directHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#25537A] border border-slate-200 rounded-md hover:bg-[#EEF4F9] transition-colors"
                        >
                          Kirim Langsung
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
