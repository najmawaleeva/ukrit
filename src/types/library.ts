export type BookFormat = 'Cetak' | 'Digital' | 'Cetak & Digital';

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  year: number;
  category: string;
  shelfLocation: string;
  totalCopies: number;
  availableCopies: number;
  coverUrl: string;
  format: BookFormat;
  description: string;
  borrowCount: number;
  createdAt: string;
}

export type NotificationChannel = 'WhatsApp' | 'Email' | 'Keduanya';
export type MembershipType = 'Mahasiswa' | 'Umum' | 'Peneliti' | 'Staf';
export type MemberStatus = 'Aktif' | 'Ditangguhkan';

export interface Member {
  id: string;
  memberCode: string;
  name: string;
  email: string;
  whatsapp: string;
  preferredChannel: NotificationChannel;
  membershipType: MembershipType;
  status: MemberStatus;
  maxLoans: number;
  joinedAt: string;
}

export type LoanStatus = 'Dipinjam' | 'Terlambat' | 'Dikembalikan';

export interface Loan {
  id: string;
  loanCode: string;
  bookId: string;
  memberId: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  status: LoanStatus;
  fineAmount: number;
  reminderH1SentAt: string | null;
  reminderDueSentAt: string | null;
  reminderOverdueSentAt: string | null;
  notes: string;
}

export interface EnrichedLoan extends Loan {
  bookTitle: string;
  bookAuthor: string;
  bookIsbn: string;
  bookCoverUrl: string;
  memberName: string;
  memberCode: string;
  memberEmail: string;
  memberWhatsapp: string;
  preferredChannel: NotificationChannel;
  daysRemaining: number;
}

export type NotificationTriggerType =
  | 'Otomatis H-1'
  | 'Otomatis Hari-H'
  | 'Otomatis Terlambat'
  | 'Manual';

export type DeliveryStatus =
  | 'Terkirim via Gateway'
  | 'Siap Kirim Langsung'
  | 'Gagal';

export interface NotificationLog {
  id: string;
  loanId: string;
  memberId: string;
  memberName: string;
  bookTitle: string;
  channel: 'WhatsApp' | 'Email';
  triggerType: NotificationTriggerType;
  recipient: string;
  subject: string;
  message: string;
  deliveryStatus: DeliveryStatus;
  providerDetail: string;
  createdAt: string;
}

export interface AutomationSettings {
  enabled: boolean;
  remindDaysBefore: number;
  remindOnDueDay: boolean;
  remindOverdueIntervalHours: number;
  dailyFinePerDay: number;
  defaultChannel: NotificationChannel;
  whatsappTemplate: string;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  lastSweepAt: string | null;
}

export type CirculationEventType =
  | 'PINJAM'
  | 'KEMBALI'
  | 'PERPANJANG'
  | 'NOTIFIKASI'
  | 'ANGGOTA_BARU'
  | 'BUKU_BARU';

export interface CirculationEvent {
  id: string;
  type: CirculationEventType;
  title: string;
  detail: string;
  timestamp: string;
}

export interface DailyCirculationPoint {
  date: string;
  label: string;
  borrowed: number;
  returned: number;
}

export interface CategoryDistributionItem {
  category: string;
  totalBooks: number;
  totalCopies: number;
  activeLoans: number;
  borrowCount: number;
}

export interface AnalyticsSnapshot {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  activeLoansCount: number;
  dueTodayCount: number;
  dueTomorrowCount: number;
  overdueCount: number;
  totalMembersCount: number;
  activeMembersCount: number;
  notificationsSentCount: number;
  utilizationRate: number;
  onTimeReturnRate: number;
  totalAccumulatedFines: number;
  dailyTrend: DailyCirculationPoint[];
  categoryDistribution: CategoryDistributionItem[];
  topBooks: Array<{
    id: string;
    title: string;
    author: string;
    category: string;
    borrowCount: number;
    availableCopies: number;
    totalCopies: number;
  }>;
  providerStatus: {
    emailConfigured: boolean;
    whatsappConfigured: boolean;
  };
}

export interface LibrarySnapshot {
  books: Book[];
  members: Member[];
  loans: EnrichedLoan[];
  notifications: NotificationLog[];
  automationSettings: AutomationSettings;
  events: CirculationEvent[];
  analytics: AnalyticsSnapshot;
}
