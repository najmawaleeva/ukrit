import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, X } from 'lucide-react';
import type {
  EnrichedLoan,
  Member,
  MembershipType,
  MemberStatus,
  NotificationChannel,
} from '../types/library';
import { formatDateId } from '../utils/formatters';

interface MembersViewProps {
  members: Member[];
  loans: EnrichedLoan[];
  onAddMember: (payload: {
    name: string;
    email: string;
    whatsapp: string;
    preferredChannel: NotificationChannel;
    membershipType: MembershipType;
    maxLoans: number;
  }) => Promise<void>;
  onUpdateMember: (
    memberId: string,
    payload: Partial<{
      name: string;
      email: string;
      whatsapp: string;
      preferredChannel: NotificationChannel;
      membershipType: MembershipType;
      status: MemberStatus;
    }>
  ) => Promise<void>;
}

export function MembersView({
  members,
  loans,
  onAddMember,
  onUpdateMember,
}: MembersViewProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Semua' | MembershipType>('Semua');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [preferredChannel, setPreferredChannel] = useState<NotificationChannel>('Keduanya');
  const [membershipType, setMembershipType] = useState<MembershipType>('Umum');
  const [maxLoans, setMaxLoans] = useState(3);

  const activeLoanCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const loan of loans) {
      if (!loan.returnedAt) {
        map.set(loan.memberId, (map.get(loan.memberId) ?? 0) + 1);
      }
    }
    return map;
  }, [loans]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (typeFilter !== 'Semua' && m.membershipType !== typeFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.memberCode.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.whatsapp.includes(q)
      );
    });
  }, [members, search, typeFilter]);

  const openCreateModal = () => {
    setEditingMember(null);
    setName('');
    setEmail('');
    setWhatsapp('');
    setPreferredChannel('Keduanya');
    setMembershipType('Umum');
    setMaxLoans(3);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setName(member.name);
    setEmail(member.email);
    setWhatsapp(member.whatsapp);
    setPreferredChannel(member.preferredChannel);
    setMembershipType(member.membershipType);
    setMaxLoans(member.maxLoans);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (editingMember) {
        await onUpdateMember(editingMember.id, {
          name,
          email,
          whatsapp,
          preferredChannel,
          membershipType,
        });
      } else {
        await onAddMember({
          name,
          email,
          whatsapp,
          preferredChannel,
          membershipType,
          maxLoans,
        });
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data anggota.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (member: Member) => {
    const nextStatus: MemberStatus = member.status === 'Aktif' ? 'Ditangguhkan' : 'Aktif';
    await onUpdateMember(member.id, { status: nextStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Manajemen Anggota
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Kelola data kontak Email & WhatsApp, preferensi kanal pengingat, dan kuota peminjaman anggota.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#25537A] rounded-lg hover:bg-[#1D4466] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Daftar Anggota Baru
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {(['Semua', 'Mahasiswa', 'Peneliti', 'Staf', 'Umum'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                typeFilter === t
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kode, email, WhatsApp..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
          />
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-900">Anggota tidak ditemukan</p>
            <p className="text-xs text-slate-500 mt-1">
              Tambahkan anggota baru agar mereka dapat meminjam koleksi dan menerima pengingat otomatis.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">ID Anggota</th>
                  <th className="py-3 px-4">Nama & Kategori</th>
                  <th className="py-3 px-4">Kontak Email & WhatsApp</th>
                  <th className="py-3 px-4">Kanal Pengingat</th>
                  <th className="py-3 px-4">Pinjaman Aktif</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member) => {
                  const activeCount = activeLoanCounts.get(member.id) ?? 0;
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        <div>{member.memberCode}</div>
                        <div className="text-[11px] text-slate-400">
                          Sejak {formatDateId(member.joinedAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{member.name}</div>
                        <div className="text-xs text-slate-500">{member.membershipType}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div>{member.email}</div>
                        <div className="font-mono text-slate-500 mt-0.5">+{member.whatsapp}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                        {member.preferredChannel}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {activeCount} / {member.maxLoans} buku
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(member)}
                          className={`text-xs font-semibold hover:underline ${
                            member.status === 'Aktif' ? 'text-[#16A34A]' : 'text-[#DC2626]'
                          }`}
                        >
                          {member.status}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(member)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Ubah
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Member Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 id="member-modal-title" className="font-display text-lg font-bold text-slate-900">
                {editingMember ? 'Ubah Data Anggota' : 'Daftar Anggota Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
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
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama anggota"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alamat Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@domain.com"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="081234567890 atau 6281234567890"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Preferensi Pengingat
                  </label>
                  <select
                    value={preferredChannel}
                    onChange={(e) => setPreferredChannel(e.target.value as NotificationChannel)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#25537A]"
                  >
                    <option value="Keduanya">Email & WhatsApp</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jenis Keanggotaan
                  </label>
                  <select
                    value={membershipType}
                    onChange={(e) => setMembershipType(e.target.value as MembershipType)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#25537A]"
                  >
                    <option value="Umum">Umum</option>
                    <option value="Mahasiswa">Mahasiswa</option>
                    <option value="Peneliti">Peneliti</option>
                    <option value="Staf">Staf</option>
                  </select>
                </div>
              </div>

              {!editingMember && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kuota Maksimal Pinjam (Buku)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={maxLoans}
                    onChange={(e) => setMaxLoans(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#25537A] rounded-lg hover:bg-[#1D4466] disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : editingMember ? 'Simpan Perubahan' : 'Daftarkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
