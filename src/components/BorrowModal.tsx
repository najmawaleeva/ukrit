import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Book, Member } from '../types/library';
import { formatDateId } from '../utils/formatters';

interface BorrowModalProps {
  open: boolean;
  books: Book[];
  members: Member[];
  initialBookId?: string;
  onClose: () => void;
  onCreateLoan: (payload: {
    bookId: string;
    memberId: string;
    durationDays: number;
    notes: string;
  }) => Promise<void>;
}

export function BorrowModal({
  open,
  books,
  members,
  initialBookId,
  onClose,
  onCreateLoan,
}: BorrowModalProps) {
  const availableBooks = books.filter((b) => b.availableCopies > 0);
  const activeMembers = members.filter((m) => m.status === 'Aktif');

  const [bookId, setBookId] = useState(initialBookId || availableBooks[0]?.id || '');
  const [memberId, setMemberId] = useState(activeMembers[0]?.id || '');
  const [durationDays, setDurationDays] = useState(7);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setBookId(initialBookId || availableBooks[0]?.id || '');
      setMemberId(activeMembers[0]?.id || '');
      setDurationDays(7);
      setNotes('');
      setError('');
    }
  }, [open, initialBookId]);

  if (!open) return null;

  const selectedMember = activeMembers.find((m) => m.id === memberId);
  const previewDueDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onCreateLoan({ bookId, memberId, durationDays, notes });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat peminjaman.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="borrow-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 id="borrow-modal-title" className="font-display text-lg font-bold text-slate-900">
            Catat Peminjaman Buku
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <p className="text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Pilih Judul Buku
            </label>
            <select
              required
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#25537A]"
            >
              {availableBooks.length === 0 ? (
                <option value="">Tidak ada buku tersedia</option>
              ) : (
                availableBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} (Sisa {b.availableCopies})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Pilih Anggota Peminjam
            </label>
            <select
              required
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#25537A]"
            >
              {activeMembers.length === 0 ? (
                <option value="">Belum ada anggota aktif</option>
              ) : (
                activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.memberCode})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Durasi Peminjaman
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[3, 7, 14].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDurationDays(d)}
                  className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                    durationDays === d
                      ? 'border-[#25537A] bg-[#EEF4F9] text-[#1D4466]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {d} Hari
                </button>
              ))}
            </div>
          </div>

          {selectedMember && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
              <div>
                Batas pengembalian:{' '}
                <strong className="text-slate-900 tabular-nums">
                  {formatDateId(previewDueDate)}
                </strong>
              </div>
              <div>
                Pengingat otomatis akan dikirim melalui{' '}
                <strong className="text-slate-900">{selectedMember.preferredChannel}</strong>.
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Keperluan tugas akhir"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || availableBooks.length === 0 || activeMembers.length === 0}
              className="px-4 py-2 text-xs font-medium text-white bg-[#25537A] rounded-lg hover:bg-[#1D4466] disabled:opacity-50"
            >
              {submitting ? 'Memproses...' : 'Konfirmasi Peminjaman'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
