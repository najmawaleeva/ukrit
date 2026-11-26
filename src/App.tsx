import { useCallback, useEffect, useState } from 'react';
import { Menu, Plus } from 'lucide-react';
import { Sidebar, type ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CatalogView } from './components/CatalogView';
import { CirculationView } from './components/CirculationView';
import { MembersView } from './components/MembersView';
import { NotificationsView } from './components/NotificationsView';
import { BorrowModal } from './components/BorrowModal';
import type {
  AutomationSettings,
  BookFormat,
  LibrarySnapshot,
  MembershipType,
  MemberStatus,
  NotificationChannel,
} from './types/library';

const TAB_LABELS: Record<ActiveTab, string> = {
  dashboard: 'Dashboard Analitik',
  catalog: 'Katalog Buku',
  circulation: 'Sirkulasi & Peminjaman',
  members: 'Manajemen Anggota',
  notifications: 'Notifikasi Otomatis',
};

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Terjadi kesalahan server.');
  }
  return data as T;
}

export default function App() {
  const [snapshot, setSnapshot] = useState<LibrarySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [streamConnected, setStreamConnected] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [preselectedBookId, setPreselectedBookId] = useState<string | undefined>(undefined);

  const fetchSnapshot = useCallback(async () => {
    try {
      const data = await apiRequest<LibrarySnapshot>('/api/snapshot');
      setSnapshot(data);
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat data perpustakaan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSnapshot();

    const source = new EventSource('/api/stream');
    source.onopen = () => {
      setStreamConnected(true);
    };
    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as LibrarySnapshot;
        setSnapshot(parsed);
        setLoading(false);
        setLoadError('');
        setStreamConnected(true);
      } catch {
        // Ignore malformed SSE frame
      }
    };
    source.onerror = () => {
      setStreamConnected(false);
    };

    return () => {
      source.close();
    };
  }, [fetchSnapshot]);

  const handleOpenBorrowModal = (bookId?: string) => {
    setPreselectedBookId(bookId);
    setBorrowModalOpen(true);
  };

  const handleAddBook = async (payload: {
    title: string;
    author: string;
    isbn: string;
    publisher: string;
    year: number;
    category: string;
    shelfLocation: string;
    totalCopies: number;
    format: BookFormat;
    description: string;
  }) => {
    await apiRequest('/api/books', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchSnapshot();
  };

  const handleCreateLoan = async (payload: {
    bookId: string;
    memberId: string;
    durationDays: number;
    notes: string;
  }) => {
    await apiRequest('/api/loans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchSnapshot();
  };

  const handleReturnLoan = async (loanId: string) => {
    await apiRequest(`/api/loans/${encodeURIComponent(loanId)}/return`, {
      method: 'POST',
    });
    await fetchSnapshot();
  };

  const handleExtendLoan = async (loanId: string, days: number) => {
    await apiRequest(`/api/loans/${encodeURIComponent(loanId)}/extend`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
    await fetchSnapshot();
  };

  const handleSendManualReminder = async (loanId: string, channel?: NotificationChannel) => {
    await apiRequest('/api/notifications/send-manual', {
      method: 'POST',
      body: JSON.stringify({ loanId, channel }),
    });
    await fetchSnapshot();
  };

  const handleAddMember = async (payload: {
    name: string;
    email: string;
    whatsapp: string;
    preferredChannel: NotificationChannel;
    membershipType: MembershipType;
    maxLoans: number;
  }) => {
    await apiRequest('/api/members', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchSnapshot();
  };

  const handleUpdateMember = async (
    memberId: string,
    payload: Partial<{
      name: string;
      email: string;
      whatsapp: string;
      preferredChannel: NotificationChannel;
      membershipType: MembershipType;
      status: MemberStatus;
    }>
  ) => {
    await apiRequest(`/api/members/${encodeURIComponent(memberId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    await fetchSnapshot();
  };

  const handleUpdateAutomationSettings = async (next: Partial<AutomationSettings>) => {
    await apiRequest('/api/automation-settings', {
      method: 'PUT',
      body: JSON.stringify(next),
    });
    await fetchSnapshot();
  };

  const handleRunSweep = async (): Promise<{ createdCount: number }> => {
    const result = await apiRequest<{ createdCount: number }>('/api/notifications/run-sweep', {
      method: 'POST',
    });
    await fetchSnapshot();
    return result;
  };

  return (
    <div className="min-h-screen flex bg-[#F6F8FA] text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        overdueCount={snapshot?.analytics.overdueCount ?? 0}
        notificationsCount={snapshot?.notifications.length ?? 0}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-slate-500 whitespace-nowrap">G-Library</span>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 truncate">
                {TAB_LABELS[activeTab]}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenBorrowModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#25537A] rounded-lg hover:bg-[#1D4466] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Pinjam Buku
          </button>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1360px] w-full mx-auto">
          {loading && !snapshot ? (
            <div className="space-y-6" aria-busy="true">
              <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse"
                  />
                ))}
              </div>
              <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
            </div>
          ) : loadError && !snapshot ? (
            <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
              <p className="text-sm font-semibold text-[#DC2626]">{loadError}</p>
              <button
                type="button"
                onClick={() => void fetchSnapshot()}
                className="mt-4 px-4 py-2 text-xs font-medium text-white bg-[#25537A] rounded-lg hover:bg-[#1D4466]"
              >
                Coba Muat Ulang
              </button>
            </div>
          ) : snapshot ? (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  analytics={snapshot.analytics}
                  events={snapshot.events}
                  loans={snapshot.loans}
                  streamConnected={streamConnected}
                  onNavigate={setActiveTab}
                  onOpenBorrowModal={() => handleOpenBorrowModal()}
                />
              )}

              {activeTab === 'catalog' && (
                <CatalogView
                  books={snapshot.books}
                  onBorrowBook={(bookId) => handleOpenBorrowModal(bookId)}
                  onAddBook={handleAddBook}
                />
              )}

              {activeTab === 'circulation' && (
                <CirculationView
                  loans={snapshot.loans}
                  onOpenBorrowModal={() => handleOpenBorrowModal()}
                  onReturnLoan={handleReturnLoan}
                  onExtendLoan={handleExtendLoan}
                  onSendManualReminder={handleSendManualReminder}
                />
              )}

              {activeTab === 'members' && (
                <MembersView
                  members={snapshot.members}
                  loans={snapshot.loans}
                  onAddMember={handleAddMember}
                  onUpdateMember={handleUpdateMember}
                />
              )}

              {activeTab === 'notifications' && (
                <NotificationsView
                  notifications={snapshot.notifications}
                  settings={snapshot.automationSettings}
                  providerStatus={snapshot.analytics.providerStatus}
                  onUpdateSettings={handleUpdateAutomationSettings}
                  onRunSweep={handleRunSweep}
                />
              )}
            </>
          ) : null}
        </main>
      </div>

      {snapshot && (
        <BorrowModal
          open={borrowModalOpen}
          books={snapshot.books}
          members={snapshot.members}
          initialBookId={preselectedBookId}
          onClose={() => setBorrowModalOpen(false)}
          onCreateLoan={handleCreateLoan}
        />
      )}
    </div>
  );
}
