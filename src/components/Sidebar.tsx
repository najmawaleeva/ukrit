import {
  BarChart3,
  BookCopy,
  Repeat2,
  Users,
  BellRing,
  X,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'catalog'
  | 'circulation'
  | 'members'
  | 'notifications';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  overdueCount: number;
  notificationsCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  icon: typeof BarChart3;
}> = [
  { id: 'dashboard', label: 'Dashboard Analitik', icon: BarChart3 },
  { id: 'catalog', label: 'Katalog Buku', icon: BookCopy },
  { id: 'circulation', label: 'Sirkulasi & Pinjam', icon: Repeat2 },
  { id: 'members', label: 'Manajemen Anggota', icon: Users },
  { id: 'notifications', label: 'Notifikasi Otomatis', icon: BellRing },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  overdueCount,
  notificationsCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handlePick = (id: ActiveTab) => {
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_srrbhosrrbhosrrb_44cafed9.jpg"
              alt="Logo G-Library Tempatnya Pengetahuan"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-[#F8F6F1]"
            />
            <div className="min-w-0">
              <p className="font-display text-base font-bold tracking-tight text-[#25537A] whitespace-nowrap truncate">
                G-Library
              </p>
              <p className="text-xs text-slate-500 whitespace-nowrap truncate">
                Tempatnya Pengetahuan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Tutup menu navigasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Navigasi utama">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const countLabel =
              item.id === 'circulation' && overdueCount > 0
                ? overdueCount
                : item.id === 'notifications' && notificationsCount > 0
                  ? notificationsCount
                  : null;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePick(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25537A] ${
                  isActive
                    ? 'bg-[#EEF4F9] text-[#1D4466]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#25537A]' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {countLabel !== null && (
                  <span
                    className={`text-xs tabular-nums font-mono ${
                      item.id === 'circulation' && overdueCount > 0
                        ? 'text-[#DC2626] font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {countLabel}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-700">Jam Layanan Sirkulasi</p>
          <p>Senin – Sabtu · 08.00 – 20.00 WIB</p>
        </div>
      </aside>
    </>
  );
}
