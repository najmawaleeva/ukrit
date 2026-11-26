import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  AnalyticsSnapshot,
  AutomationSettings,
  Book,
  BookFormat,
  CirculationEvent,
  CirculationEventType,
  EnrichedLoan,
  LibrarySnapshot,
  Loan,
  Member,
  MembershipType,
  MemberStatus,
  NotificationChannel,
  NotificationLog,
  NotificationTriggerType,
} from '../src/types/library.ts';

interface LibraryDatabase {
  books: Book[];
  members: Member[];
  loans: Loan[];
  notifications: NotificationLog[];
  automationSettings: AutomationSettings;
  events: CirculationEvent[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const IS_DEV = process.env.NODE_ENV !== 'production';

function resolveWritableDataDir(): string {
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
    return path.resolve(os.tmpdir(), 'g-library-data');
  }
  return path.resolve(process.cwd(), 'data');
}

let activeDataDir = resolveWritableDataDir();
let persistenceDisabled = false;

function nowIso(): string {
  return new Date().toISOString();
}

function daysFromNowIso(days: number): string {
  return new Date(Date.now() + days * MS_PER_DAY).toISOString();
}

function safeDateMs(iso: string | null | undefined, fallbackMs = Date.now()): number {
  if (!iso) return fallbackMs;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : fallbackMs;
}

function formatDateId(iso: string): string {
  const ms = safeDateMs(iso, NaN);
  if (Number.isNaN(ms)) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ms));
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function normalizeWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }
  if (digits.startsWith('8')) {
    return '62' + digits;
  }
  return digits;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160;
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function createInitialDatabase(): LibraryDatabase {
  const books: Book[] = [
    {
      id: 'book-1',
      isbn: '978-602-03-8841-1',
      title: 'Kosmos & Kesadaran: Pengantar Filsafat Sains Modern',
      author: 'Dr. Eliza Reed & Prof. Liam Chen',
      publisher: 'Pustaka Cendekia',
      year: 2025,
      category: 'Sains & Filsafat',
      shelfLocation: 'Rak A-01',
      totalCopies: 6,
      availableCopies: 4,
      coverUrl: '/src/assets/images/cover_filosofi_ilmu_1795657874927.jpg',
      format: 'Cetak & Digital',
      description:
        'Eksplorasi mendalam mengenai titik temu antara kosmologi modern, teori kesadaran, dan metode ilmiah kontemporer.',
      borrowCount: 42,
      createdAt: daysFromNowIso(-45),
    },
    {
      id: 'book-2',
      isbn: '978-623-41-2910-4',
      title: 'Arsitektur Sistem & Dinamika Data Skala Besar',
      author: 'Eliza Reed',
      publisher: 'Informatika Nusantara',
      year: 2026,
      category: 'Teknologi & Data',
      shelfLocation: 'Rak B-04',
      totalCopies: 5,
      availableCopies: 2,
      coverUrl: '/src/assets/images/cover_arsitektur_data_1795657874463.jpg',
      format: 'Cetak & Digital',
      description:
        'Panduan praktis merancang sistem terdistribusi, pemrosesan aliran data real-time, dan arsitektur basis data tangguh.',
      borrowCount: 58,
      createdAt: daysFromNowIso(-40),
    },
    {
      id: 'book-3',
      isbn: '978-602-42-1198-7',
      title: 'Hutan Belantara di Antara Kita',
      author: 'Clara Eliza Reed',
      publisher: 'Aura Sastra Press',
      year: 2024,
      category: 'Sastra & Fiksi',
      shelfLocation: 'Rak C-12',
      totalCopies: 4,
      availableCopies: 2,
      coverUrl: '/src/assets/images/cover_sastra_nusantara_1795657874682.jpg',
      format: 'Cetak',
      description:
        'Kumpulan prosa liris tentang ekologi manusia, ingatan kolektif desa hutan, dan relasi sunyi antar generasi.',
      borrowCount: 37,
      createdAt: daysFromNowIso(-38),
    },
    {
      id: 'book-4',
      isbn: '978-623-98-5512-3',
      title: 'Ekonomi & Arsitektur Pertumbuhan Inklusif',
      author: 'Eliza R. Vance',
      publisher: 'Balai Ekonomi Mandiri',
      year: 2025,
      category: 'Ekonomi & Bisnis',
      shelfLocation: 'Rak D-02',
      totalCopies: 5,
      availableCopies: 3,
      coverUrl: '/src/assets/images/cover_ekonomi_kreatif_1795657875578.jpg',
      format: 'Cetak & Digital',
      description:
        'Analisis struktur pasar, desain kelembagaan ekonomi digital, dan strategi pertumbuhan berkelanjutan di Asia Tenggara.',
      borrowCount: 31,
      createdAt: daysFromNowIso(-30),
    },
    {
      id: 'book-5',
      isbn: '978-602-88-3021-8',
      title: 'Metodologi Riset Kualitatif & Analisis Jaringan Sosial',
      author: 'Prof. Hendra Wijaya',
      publisher: 'Universitas Press',
      year: 2024,
      category: 'Pendidikan & Riset',
      shelfLocation: 'Rak E-07',
      totalCopies: 4,
      availableCopies: 3,
      coverUrl: '/src/assets/images/cover_filosofi_ilmu_1795657874927.jpg',
      format: 'Digital',
      description:
        'Buku pegangan peneliti dalam menyusun instrumen wawancara, studi etnografi digital, dan pemetaan relasi komunitas.',
      borrowCount: 24,
      createdAt: daysFromNowIso(-25),
    },
    {
      id: 'book-6',
      isbn: '978-623-10-4409-2',
      title: 'Rekayasa Antarmuka & Tipografi Publikasi Modern',
      author: 'Nadia Kusuma',
      publisher: 'Desain Aksara',
      year: 2025,
      category: 'Teknologi & Data',
      shelfLocation: 'Rak B-09',
      totalCopies: 3,
      availableCopies: 2,
      coverUrl: '/src/assets/images/cover_arsitektur_data_1795657874463.jpg',
      format: 'Cetak & Digital',
      description:
        'Prinsip keterbacaan tipografi, grid editorial, dan sistem aksesibilitas untuk aplikasi web dan publikasi digital.',
      borrowCount: 29,
      createdAt: daysFromNowIso(-18),
    },
  ];

  const members: Member[] = [
    {
      id: 'mem-1',
      memberCode: 'GLB-2026-001',
      name: 'Najma Waleeva',
      email: 'najmawaleeva@gmail.com',
      whatsapp: '6281234567890',
      preferredChannel: 'Keduanya',
      membershipType: 'Peneliti',
      status: 'Aktif',
      maxLoans: 5,
      joinedAt: daysFromNowIso(-90),
    },
    {
      id: 'mem-2',
      memberCode: 'GLB-2026-002',
      name: 'Raka Pratama Putra',
      email: 'raka.pratama@kampus.ac.id',
      whatsapp: '6281398765432',
      preferredChannel: 'WhatsApp',
      membershipType: 'Mahasiswa',
      status: 'Aktif',
      maxLoans: 3,
      joinedAt: daysFromNowIso(-75),
    },
    {
      id: 'mem-3',
      memberCode: 'GLB-2026-003',
      name: 'Siti Rahmawati',
      email: 'siti.rahma@pustaka.org',
      whatsapp: '6285711223344',
      preferredChannel: 'Email',
      membershipType: 'Staf',
      status: 'Aktif',
      maxLoans: 6,
      joinedAt: daysFromNowIso(-60),
    },
    {
      id: 'mem-4',
      memberCode: 'GLB-2026-004',
      name: 'Dimas Aditya Nugroho',
      email: 'dimas.nugroho@mail.com',
      whatsapp: '6281922334455',
      preferredChannel: 'WhatsApp',
      membershipType: 'Umum',
      status: 'Aktif',
      maxLoans: 3,
      joinedAt: daysFromNowIso(-32),
    },
    {
      id: 'mem-5',
      memberCode: 'GLB-2026-005',
      name: 'Aulia Kartika Dewi',
      email: 'aulia.kartika@riset.id',
      whatsapp: '6282155667788',
      preferredChannel: 'Keduanya',
      membershipType: 'Mahasiswa',
      status: 'Aktif',
      maxLoans: 3,
      joinedAt: daysFromNowIso(-14),
    },
  ];

  const loans: Loan[] = [
    {
      id: 'loan-1',
      loanCode: 'PJM-2611-001',
      bookId: 'book-2',
      memberId: 'mem-1',
      borrowedAt: daysFromNowIso(-6),
      dueAt: daysFromNowIso(1),
      returnedAt: null,
      status: 'Dipinjam',
      fineAmount: 0,
      reminderH1SentAt: null,
      reminderDueSentAt: null,
      reminderOverdueSentAt: null,
      notes: 'Referensi riset arsitektur data',
    },
    {
      id: 'loan-2',
      loanCode: 'PJM-2611-002',
      bookId: 'book-1',
      memberId: 'mem-2',
      borrowedAt: daysFromNowIso(-9),
      dueAt: daysFromNowIso(-2),
      returnedAt: null,
      status: 'Terlambat',
      fineAmount: 4000,
      reminderH1SentAt: daysFromNowIso(-3),
      reminderDueSentAt: daysFromNowIso(-2),
      reminderOverdueSentAt: daysFromNowIso(-1),
      notes: 'Peminjaman reguler 7 hari',
    },
    {
      id: 'loan-3',
      loanCode: 'PJM-2611-003',
      bookId: 'book-3',
      memberId: 'mem-3',
      borrowedAt: daysFromNowIso(-7),
      dueAt: daysFromNowIso(0),
      returnedAt: null,
      status: 'Dipinjam',
      fineAmount: 0,
      reminderH1SentAt: daysFromNowIso(-1),
      reminderDueSentAt: null,
      reminderOverdueSentAt: null,
      notes: '',
    },
    {
      id: 'loan-4',
      loanCode: 'PJM-2611-004',
      bookId: 'book-4',
      memberId: 'mem-4',
      borrowedAt: daysFromNowIso(-3),
      dueAt: daysFromNowIso(4),
      returnedAt: null,
      status: 'Dipinjam',
      fineAmount: 0,
      reminderH1SentAt: null,
      reminderDueSentAt: null,
      reminderOverdueSentAt: null,
      notes: '',
    },
    {
      id: 'loan-5',
      loanCode: 'PJM-2611-005',
      bookId: 'book-2',
      memberId: 'mem-5',
      borrowedAt: daysFromNowIso(-2),
      dueAt: daysFromNowIso(5),
      returnedAt: null,
      status: 'Dipinjam',
      fineAmount: 0,
      reminderH1SentAt: null,
      reminderDueSentAt: null,
      reminderOverdueSentAt: null,
      notes: '',
    },
    {
      id: 'loan-6',
      loanCode: 'PJM-2611-006',
      bookId: 'book-6',
      memberId: 'mem-1',
      borrowedAt: daysFromNowIso(-1),
      dueAt: daysFromNowIso(6),
      returnedAt: null,
      status: 'Dipinjam',
      fineAmount: 0,
      reminderH1SentAt: null,
      reminderDueSentAt: null,
      reminderOverdueSentAt: null,
      notes: '',
    },
    {
      id: 'loan-7',
      loanCode: 'PJM-2611-007',
      bookId: 'book-5',
      memberId: 'mem-2',
      borrowedAt: daysFromNowIso(-5),
      dueAt: daysFromNowIso(2),
      returnedAt: daysFromNowIso(-1),
      status: 'Dikembalikan',
      fineAmount: 0,
      reminderH1SentAt: null,
      reminderDueSentAt: null,
      reminderOverdueSentAt: null,
      notes: 'Dikembalikan tepat waktu',
    },
    {
      id: 'loan-8',
      loanCode: 'PJM-2611-008',
      bookId: 'book-1',
      memberId: 'mem-4',
      borrowedAt: daysFromNowIso(-4),
      dueAt: daysFromNowIso(3),
      returnedAt: daysFromNowIso(0),
      status: 'Dikembalikan',
      fineAmount: 0,
      reminderH1SentAt: null,
      reminderDueSentAt: null,
      reminderOverdueSentAt: null,
      notes: '',
    },
  ];

  const notifications: NotificationLog[] = [
    {
      id: 'notif-1',
      loanId: 'loan-2',
      memberId: 'mem-2',
      memberName: 'Raka Pratama Putra',
      bookTitle: 'Kosmos & Kesadaran: Pengantar Filsafat Sains Modern',
      channel: 'WhatsApp',
      triggerType: 'Otomatis Terlambat',
      recipient: '6281398765432',
      subject: 'Pengingat Keterlambatan Pengembalian Buku — G-Library',
      message:
        'Halo Raka Pratama Putra, buku "Kosmos & Kesadaran: Pengantar Filsafat Sains Modern" telah melewati batas pengembalian (2 hari). Mohon segera dikembalikan ke G-Library untuk menghentikan denda berjalan.',
      deliveryStatus: 'Siap Kirim Langsung',
      providerDetail: 'Antrean WhatsApp Web / Gateway lokal',
      createdAt: daysFromNowIso(-1),
    },
    {
      id: 'notif-2',
      loanId: 'loan-3',
      memberId: 'mem-3',
      memberName: 'Siti Rahmawati',
      bookTitle: 'Hutan Belantara di Antara Kita',
      channel: 'Email',
      triggerType: 'Otomatis H-1',
      recipient: 'siti.rahma@pustaka.org',
      subject: 'Pengingat H-1 Pengembalian Buku: Hutan Belantara di Antara Kita',
      message:
        'Yth. Siti Rahmawati, masa pinjam buku "Hutan Belantara di Antara Kita" akan berakhir besok. Terima kasih telah menjaga sirkulasi G-Library tetap lancar.',
      deliveryStatus: 'Siap Kirim Langsung',
      providerDetail: 'Antrean Email / Mailto lokal',
      createdAt: daysFromNowIso(-1),
    },
  ];

  const automationSettings: AutomationSettings = {
    enabled: true,
    remindDaysBefore: 1,
    remindOnDueDay: true,
    remindOverdueIntervalHours: 24,
    dailyFinePerDay: 2000,
    defaultChannel: 'Keduanya',
    whatsappTemplate:
      'Halo {nama}, pengingat dari G-Library: buku "{judul_buku}" jatuh tempo pada {tanggal_jatuh_tempo} ({status_waktu}). {info_denda}Terima kasih telah mengembalikan tepat waktu.',
    emailSubjectTemplate: '[G-Library] Pengingat Pengembalian: {judul_buku}',
    emailBodyTemplate:
      'Yth. {nama},\n\nKami mengingatkan bahwa peminjaman buku "{judul_buku}" memiliki batas pengembalian pada {tanggal_jatuh_tempo} ({status_waktu}).\n{info_denda}\nSilakan kembalikan buku ke meja sirkulasi G-Library atau ajukan perpanjangan.\n\nSalam hangat,\nTim G-Library — Tempatnya Pengetahuan',
    lastSweepAt: nowIso(),
  };

  const events: CirculationEvent[] = [
    {
      id: 'evt-1',
      type: 'KEMBALI',
      title: 'Pengembalian Selesai',
      detail: 'Dimas Aditya Nugroho mengembalikan "Kosmos & Kesadaran"',
      timestamp: daysFromNowIso(0),
    },
    {
      id: 'evt-2',
      type: 'PINJAM',
      title: 'Peminjaman Baru',
      detail: 'Najma Waleeva meminjam "Rekayasa Antarmuka & Tipografi"',
      timestamp: daysFromNowIso(-1),
    },
    {
      id: 'evt-3',
      type: 'NOTIFIKASI',
      title: 'Pengingat Otomatis Terlambat',
      detail: 'WhatsApp dijadwalkan untuk Raka Pratama Putra',
      timestamp: daysFromNowIso(-1),
    },
    {
      id: 'evt-4',
      type: 'PINJAM',
      title: 'Peminjaman Baru',
      detail: 'Aulia Kartika Dewi meminjam "Arsitektur Sistem & Dinamika Data"',
      timestamp: daysFromNowIso(-2),
    },
  ];

  return {
    books,
    members,
    loans,
    notifications,
    automationSettings,
    events,
  };
}

function getDbFilePath(): string {
  return path.resolve(activeDataDir, 'library-db.json');
}

function ensureWritableStorage(): boolean {
  if (persistenceDisabled) return false;
  try {
    if (!fs.existsSync(activeDataDir)) {
      fs.mkdirSync(activeDataDir, { recursive: true });
    }
    return true;
  } catch (err) {
    const fallbackDir = path.resolve(os.tmpdir(), 'g-library-data');
    if (activeDataDir !== fallbackDir) {
      console.warn(
        `[G-Library Storage] Direktori "${activeDataDir}" tidak dapat ditulis, beralih ke "${fallbackDir}".`,
        err instanceof Error ? err.message : err
      );
      activeDataDir = fallbackDir;
      try {
        if (!fs.existsSync(activeDataDir)) {
          fs.mkdirSync(activeDataDir, { recursive: true });
        }
        return true;
      } catch (fallbackErr) {
        console.warn(
          '[G-Library Storage] Penyimpanan file tidak tersedia, menggunakan memori proses.',
          fallbackErr instanceof Error ? fallbackErr.message : fallbackErr
        );
      }
    }
    persistenceDisabled = true;
    return false;
  }
}

function saveDatabase(database: LibraryDatabase): void {
  if (!ensureWritableStorage()) return;
  try {
    const dbFile = getDbFilePath();
    if (!dbFile.startsWith(activeDataDir + path.sep)) {
      throw new Error('Invalid database file path');
    }
    const tempFile = path.resolve(
      activeDataDir,
      `.library-db-${process.pid}-${Date.now()}.tmp`
    );
    fs.writeFileSync(tempFile, JSON.stringify(database, null, 2), 'utf8');
    fs.renameSync(tempFile, dbFile);
  } catch (err) {
    console.warn(
      '[G-Library Storage] Gagal menulis file database, state tetap aman di memori:',
      err instanceof Error ? err.message : err
    );
  }
}

function loadDatabase(): LibraryDatabase {
  if (!ensureWritableStorage()) {
    return createInitialDatabase();
  }
  const dbFile = getDbFilePath();
  if (!fs.existsSync(dbFile)) {
    const initial = createInitialDatabase();
    saveDatabase(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(dbFile, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LibraryDatabase>;
    const defaults = createInitialDatabase();
    return {
      books: Array.isArray(parsed.books) ? parsed.books : defaults.books,
      members: Array.isArray(parsed.members) ? parsed.members : defaults.members,
      loans: Array.isArray(parsed.loans) ? parsed.loans : defaults.loans,
      notifications: Array.isArray(parsed.notifications)
        ? parsed.notifications
        : defaults.notifications,
      automationSettings: parsed.automationSettings ?? defaults.automationSettings,
      events: Array.isArray(parsed.events) ? parsed.events : defaults.events,
    };
  } catch (err) {
    console.error('[G-Library Storage] File database rusak/gagal dibaca, memuat ulang data awal:', err);
    const initial = createInitialDatabase();
    saveDatabase(initial);
    return initial;
  }
}

let db: LibraryDatabase = loadDatabase();
const sseClients = new Set<Response>();

function pushEvent(type: CirculationEventType, title: string, detail: string): void {
  const evt: CirculationEvent = {
    id: `evt-${crypto.randomUUID().slice(0, 8)}`,
    type,
    title,
    detail,
    timestamp: nowIso(),
  };
  db.events.unshift(evt);
  if (db.events.length > 40) {
    db.events = db.events.slice(0, 40);
  }
}

function enrichLoans(database: LibraryDatabase): EnrichedLoan[] {
  const bookMap = new Map(database.books.map((b) => [b.id, b]));
  const memberMap = new Map(database.members.map((m) => [m.id, m]));
  const now = Date.now();
  const dailyFine = Number(database.automationSettings?.dailyFinePerDay) || 2000;

  return database.loans.map((loan) => {
    const book = bookMap.get(loan.bookId);
    const member = memberMap.get(loan.memberId);
    const dueMs = safeDateMs(loan.dueAt, now);
    const diffDays = Math.ceil((dueMs - now) / MS_PER_DAY);

    let computedStatus = loan.status;
    let computedFine = Number(loan.fineAmount) || 0;

    if (!loan.returnedAt) {
      if (dueMs < now) {
        computedStatus = 'Terlambat';
        const overdueDays = Math.max(1, Math.ceil((now - dueMs) / MS_PER_DAY));
        computedFine = overdueDays * dailyFine;
      } else {
        computedStatus = 'Dipinjam';
        computedFine = 0;
      }
    }

    return {
      ...loan,
      status: computedStatus,
      fineAmount: computedFine,
      bookTitle: book?.title ?? 'Koleksi Terhapus',
      bookAuthor: book?.author ?? '-',
      bookIsbn: book?.isbn ?? '-',
      bookCoverUrl: book?.coverUrl ?? '',
      memberName: member?.name ?? 'Anggota Terhapus',
      memberCode: member?.memberCode ?? '-',
      memberEmail: member?.email ?? '',
      memberWhatsapp: member?.whatsapp ?? '',
      preferredChannel: member?.preferredChannel ?? 'WhatsApp',
      daysRemaining: loan.returnedAt ? 0 : diffDays,
    };
  });
}

function computeAnalytics(
  database: LibraryDatabase,
  enrichedLoans: EnrichedLoan[]
): AnalyticsSnapshot {
  const totalTitles = database.books.length;
  const totalCopies = database.books.reduce((acc, b) => acc + (Number(b.totalCopies) || 0), 0);
  const availableCopies = database.books.reduce(
    (acc, b) => acc + (Number(b.availableCopies) || 0),
    0
  );

  const activeLoans = enrichedLoans.filter((l) => !l.returnedAt);
  const activeLoansCount = activeLoans.length;
  const dueTodayCount = activeLoans.filter((l) => l.daysRemaining === 0).length;
  const dueTomorrowCount = activeLoans.filter((l) => l.daysRemaining === 1).length;
  const overdueCount = activeLoans.filter((l) => l.status === 'Terlambat').length;

  const returnedLoans = enrichedLoans.filter((l) => Boolean(l.returnedAt));
  const onTimeReturns = returnedLoans.filter((l) => {
    if (!l.returnedAt) return false;
    return safeDateMs(l.returnedAt, 0) <= safeDateMs(l.dueAt, 0);
  }).length;
  const onTimeReturnRate =
    returnedLoans.length > 0 ? Math.round((onTimeReturns / returnedLoans.length) * 100) : 100;

  const utilizationRate =
    totalCopies > 0 ? Math.round(((totalCopies - availableCopies) / totalCopies) * 100) : 0;

  const totalAccumulatedFines = enrichedLoans.reduce(
    (acc, l) => acc + (Number(l.fineAmount) || 0),
    0
  );

  const dailyTrend = [];
  const dayFormatter = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric' });
  for (let i = 6; i >= 0; i--) {
    const dayDate = new Date(Date.now() - i * MS_PER_DAY);
    const yyyyMmDd = dayDate.toISOString().slice(0, 10);
    const borrowed = database.loans.filter(
      (l) => typeof l.borrowedAt === 'string' && l.borrowedAt.slice(0, 10) === yyyyMmDd
    ).length;
    const returned = database.loans.filter(
      (l) => typeof l.returnedAt === 'string' && l.returnedAt.slice(0, 10) === yyyyMmDd
    ).length;
    dailyTrend.push({
      date: yyyyMmDd,
      label: dayFormatter.format(dayDate),
      borrowed,
      returned,
    });
  }

  const catMap = new Map<
    string,
    { totalBooks: number; totalCopies: number; activeLoans: number; borrowCount: number }
  >();
  for (const book of database.books) {
    const categoryName = book.category || 'Umum';
    const entry = catMap.get(categoryName) ?? {
      totalBooks: 0,
      totalCopies: 0,
      activeLoans: 0,
      borrowCount: 0,
    };
    entry.totalBooks += 1;
    entry.totalCopies += Number(book.totalCopies) || 0;
    entry.borrowCount += Number(book.borrowCount) || 0;
    catMap.set(categoryName, entry);
  }
  const bookCategoryById = new Map(database.books.map((b) => [b.id, b.category || 'Umum']));
  for (const loan of activeLoans) {
    const cat = bookCategoryById.get(loan.bookId);
    if (cat && catMap.has(cat)) {
      catMap.get(cat)!.activeLoans += 1;
    }
  }

  const categoryDistribution = Array.from(catMap.entries())
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.borrowCount - a.borrowCount);

  const topBooks = [...database.books]
    .sort((a, b) => (Number(b.borrowCount) || 0) - (Number(a.borrowCount) || 0))
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      category: b.category,
      borrowCount: Number(b.borrowCount) || 0,
      availableCopies: Number(b.availableCopies) || 0,
      totalCopies: Number(b.totalCopies) || 0,
    }));

  return {
    totalTitles,
    totalCopies,
    availableCopies,
    activeLoansCount,
    dueTodayCount,
    dueTomorrowCount,
    overdueCount,
    totalMembersCount: database.members.length,
    activeMembersCount: database.members.filter((m) => m.status === 'Aktif').length,
    notificationsSentCount: database.notifications.length,
    utilizationRate,
    onTimeReturnRate,
    totalAccumulatedFines,
    dailyTrend,
    categoryDistribution,
    topBooks,
    providerStatus: {
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
      whatsappConfigured: Boolean(process.env.WHATSAPP_WEBHOOK_URL),
    },
  };
}

function buildSnapshot(): LibrarySnapshot {
  const enrichedLoans = enrichLoans(db);
  const analytics = computeAnalytics(db, enrichedLoans);
  return {
    books: db.books,
    members: db.members,
    loans: enrichedLoans,
    notifications: db.notifications,
    automationSettings: db.automationSettings,
    events: db.events,
    analytics,
  };
}

function broadcastSnapshot(): void {
  if (sseClients.size === 0) return;
  const payload = `data: ${JSON.stringify(buildSnapshot())}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function renderReminderTemplate(
  template: string,
  loan: EnrichedLoan,
  settings: AutomationSettings
): string {
  let statusWaktu = '';
  if (loan.daysRemaining < 0) {
    statusWaktu = `terlambat ${Math.abs(loan.daysRemaining)} hari`;
  } else if (loan.daysRemaining === 0) {
    statusWaktu = 'jatuh tempo hari ini';
  } else {
    statusWaktu = `sisa waktu ${loan.daysRemaining} hari`;
  }

  const infoDenda =
    loan.fineAmount > 0
      ? `Estimasi denda keterlambatan saat ini: ${formatRupiah(loan.fineAmount)} (${formatRupiah(
          settings.dailyFinePerDay
        )}/hari). `
      : '';

  return template
    .replaceAll('{nama}', loan.memberName)
    .replaceAll('{judul_buku}', loan.bookTitle)
    .replaceAll('{tanggal_jatuh_tempo}', formatDateId(loan.dueAt))
    .replaceAll('{status_waktu}', statusWaktu)
    .replaceAll('{sisa_hari}', String(loan.daysRemaining))
    .replaceAll('{denda}', formatRupiah(loan.fineAmount))
    .replaceAll('{info_denda}', infoDenda);
}

function isAllowedExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

async function dispatchNotification(params: {
  loan: EnrichedLoan;
  channel: 'WhatsApp' | 'Email';
  triggerType: NotificationTriggerType;
}): Promise<NotificationLog> {
  const { loan, channel, triggerType } = params;
  const settings = db.automationSettings;

  const subject = renderReminderTemplate(settings.emailSubjectTemplate, loan, settings);
  const message = renderReminderTemplate(
    channel === 'WhatsApp' ? settings.whatsappTemplate : settings.emailBodyTemplate,
    loan,
    settings
  );

  const recipient = channel === 'WhatsApp' ? loan.memberWhatsapp : loan.memberEmail;
  let deliveryStatus: NotificationLog['deliveryStatus'] = 'Siap Kirim Langsung';
  let providerDetail =
    channel === 'WhatsApp'
      ? 'Siap kirim via WhatsApp Web / Gateway lokal'
      : 'Siap kirim via Email Client / Gateway lokal';

  if (channel === 'Email' && process.env.RESEND_API_KEY) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'G-Library <noreply@g-library.local>';
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipient],
          subject,
          text: message,
        }),
      });
      if (resp.ok) {
        deliveryStatus = 'Terkirim via Gateway';
        providerDetail = 'Terkirim otomatis melalui Resend Email API';
      } else {
        deliveryStatus = 'Gagal';
        providerDetail = `Email gateway merespons HTTP ${resp.status}`;
      }
    } catch (err) {
      console.error('[G-Library Email Gateway] Gagal mengirim email:', err);
      deliveryStatus = 'Gagal';
      providerDetail = 'Koneksi ke Email gateway gagal';
    }
  } else if (
    channel === 'WhatsApp' &&
    process.env.WHATSAPP_WEBHOOK_URL &&
    isAllowedExternalUrl(process.env.WHATSAPP_WEBHOOK_URL)
  ) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (process.env.WHATSAPP_API_TOKEN) {
        headers.Authorization = `Bearer ${process.env.WHATSAPP_API_TOKEN}`;
      }
      const resp = await fetch(process.env.WHATSAPP_WEBHOOK_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target: recipient,
          phone: recipient,
          message,
          memberName: loan.memberName,
          bookTitle: loan.bookTitle,
          loanCode: loan.loanCode,
        }),
      });
      if (resp.ok) {
        deliveryStatus = 'Terkirim via Gateway';
        providerDetail = 'Terkirim otomatis melalui WhatsApp Gateway';
      } else {
        deliveryStatus = 'Gagal';
        providerDetail = `WhatsApp gateway merespons HTTP ${resp.status}`;
      }
    } catch (err) {
      console.error('[G-Library WhatsApp Gateway] Gagal mengirim WhatsApp:', err);
      deliveryStatus = 'Gagal';
      providerDetail = 'Koneksi ke WhatsApp gateway gagal';
    }
  }

  const entry: NotificationLog = {
    id: `notif-${crypto.randomUUID().slice(0, 8)}`,
    loanId: loan.id,
    memberId: loan.memberId,
    memberName: loan.memberName,
    bookTitle: loan.bookTitle,
    channel,
    triggerType,
    recipient,
    subject,
    message,
    deliveryStatus,
    providerDetail,
    createdAt: nowIso(),
  };

  db.notifications.unshift(entry);
  if (db.notifications.length > 200) {
    db.notifications = db.notifications.slice(0, 200);
  }

  return entry;
}

export async function runAutomationSweep(force = false): Promise<{ createdCount: number }> {
  if (!db.automationSettings.enabled && !force) {
    return { createdCount: 0 };
  }

  const enrichedLoans = enrichLoans(db);
  const now = Date.now();
  let createdCount = 0;

  for (const enriched of enrichedLoans) {
    if (enriched.returnedAt) continue;

    const rawLoan = db.loans.find((l) => l.id === enriched.id);
    if (!rawLoan) continue;

    if (enriched.status !== rawLoan.status || enriched.fineAmount !== rawLoan.fineAmount) {
      rawLoan.status = enriched.status;
      rawLoan.fineAmount = enriched.fineAmount;
    }

    let triggerType: NotificationTriggerType | null = null;
    if (enriched.daysRemaining < 0) {
      const lastOverdue = rawLoan.reminderOverdueSentAt
        ? safeDateMs(rawLoan.reminderOverdueSentAt, 0)
        : 0;
      const intervalMs = db.automationSettings.remindOverdueIntervalHours * 60 * 60 * 1000;
      if (!lastOverdue || now - lastOverdue >= intervalMs) {
        triggerType = 'Otomatis Terlambat';
        rawLoan.reminderOverdueSentAt = nowIso();
      }
    } else if (enriched.daysRemaining === 0 && db.automationSettings.remindOnDueDay) {
      if (!rawLoan.reminderDueSentAt) {
        triggerType = 'Otomatis Hari-H';
        rawLoan.reminderDueSentAt = nowIso();
      }
    } else if (
      enriched.daysRemaining > 0 &&
      enriched.daysRemaining <= db.automationSettings.remindDaysBefore
    ) {
      if (!rawLoan.reminderH1SentAt) {
        triggerType = 'Otomatis H-1';
        rawLoan.reminderH1SentAt = nowIso();
      }
    }

    if (!triggerType) continue;

    const pref = enriched.preferredChannel;
    const channels: Array<'WhatsApp' | 'Email'> =
      pref === 'Keduanya' ? ['WhatsApp', 'Email'] : [pref];

    for (const ch of channels) {
      if (ch === 'WhatsApp' && !enriched.memberWhatsapp) continue;
      if (ch === 'Email' && !enriched.memberEmail) continue;
      await dispatchNotification({ loan: enriched, channel: ch, triggerType });
      createdCount += 1;
    }

    pushEvent(
      'NOTIFIKASI',
      triggerType,
      `Pengingat ${channels.join(' & ')} untuk ${enriched.memberName} (${enriched.bookTitle})`
    );
  }

  db.automationSettings.lastSweepAt = nowIso();
  saveDatabase(db);
  if (createdCount > 0) {
    broadcastSnapshot();
  }
  return { createdCount };
}

function sendServerError(
  res: Response,
  context: string,
  err: unknown,
  statusCode = 500
): void {
  const message = err instanceof Error ? err.message : 'Unknown error';
  console.error(`[G-Library API Error] ${context}:`, err);
  res.status(statusCode).json({
    error: `Gagal memproses ${context}.`,
    code: 'INTERNAL_SERVER_ERROR',
    ...(IS_DEV ? { detail: message } : {}),
  });
}

export function createLibraryApiApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      storageDir: IS_DEV ? activeDataDir : undefined,
      persistenceMode: persistenceDisabled ? 'memory' : 'file',
      timestamp: nowIso(),
    });
  });

  app.get('/api/stream', (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      sseClients.add(res);
      res.write(`data: ${JSON.stringify(buildSnapshot())}\n\n`);

      const keepAlive = setInterval(() => {
        try {
          res.write(': keepalive\n\n');
        } catch {
          clearInterval(keepAlive);
          sseClients.delete(res);
        }
      }, 25000);

      req.on('close', () => {
        clearInterval(keepAlive);
        sseClients.delete(res);
      });
    } catch (err) {
      sendServerError(res, 'aliran data real-time (/api/stream)', err);
    }
  });

  app.get('/api/snapshot', (_req: Request, res: Response) => {
    try {
      res.json(buildSnapshot());
    } catch (err) {
      sendServerError(res, 'snapshot analitik dashboard (/api/snapshot)', err);
    }
  });

  app.get('/api/analytics', (_req: Request, res: Response) => {
    try {
      const snapshot = buildSnapshot();
      res.json(snapshot.analytics);
    } catch (err) {
      sendServerError(res, 'data analitik (/api/analytics)', err);
    }
  });

  app.post('/api/books', (req: Request, res: Response) => {
    try {
      const title = sanitizeText(req.body?.title, 160);
      const author = sanitizeText(req.body?.author, 120);
      const isbn = sanitizeText(req.body?.isbn, 40);
      const publisher = sanitizeText(req.body?.publisher, 100) || 'Pustaka G-Library';
      const category = sanitizeText(req.body?.category, 60) || 'Umum';
      const shelfLocation = sanitizeText(req.body?.shelfLocation, 40) || 'Rak A-01';
      const description = sanitizeText(req.body?.description, 500);
      const year = Math.min(
        2030,
        Math.max(1900, Number(req.body?.year) || new Date().getFullYear())
      );
      const totalCopies = Math.min(
        200,
        Math.max(1, Math.floor(Number(req.body?.totalCopies) || 1))
      );
      const allowedFormats: BookFormat[] = ['Cetak', 'Digital', 'Cetak & Digital'];
      const format: BookFormat = allowedFormats.includes(req.body?.format)
        ? req.body.format
        : 'Cetak & Digital';

      const coverOptions = [
        '/src/assets/images/cover_filosofi_ilmu_1795657874927.jpg',
        '/src/assets/images/cover_arsitektur_data_1795657874463.jpg',
        '/src/assets/images/cover_sastra_nusantara_1795657874682.jpg',
        '/src/assets/images/cover_ekonomi_kreatif_1795657875578.jpg',
      ];
      const requestedCover = sanitizeText(req.body?.coverUrl, 200);
      const coverUrl = coverOptions.includes(requestedCover)
        ? requestedCover
        : coverOptions[db.books.length % coverOptions.length];

      if (!title || !author || !isbn) {
        res.status(400).json({ error: 'Judul, penulis, dan ISBN wajib diisi.' });
        return;
      }

      const newBook: Book = {
        id: `book-${crypto.randomUUID().slice(0, 8)}`,
        isbn,
        title,
        author,
        publisher,
        year,
        category,
        shelfLocation,
        totalCopies,
        availableCopies: totalCopies,
        coverUrl,
        format,
        description:
          description || `Koleksi ${category} oleh ${author}, diterbitkan oleh ${publisher}.`,
        borrowCount: 0,
        createdAt: nowIso(),
      };

      db.books.unshift(newBook);
      pushEvent(
        'BUKU_BARU',
        'Koleksi Baru Ditambahkan',
        `"${newBook.title}" (${totalCopies} eksemplar)`
      );
      saveDatabase(db);
      broadcastSnapshot();
      res.status(201).json(newBook);
    } catch (err) {
      sendServerError(res, 'penambahan koleksi buku (/api/books)', err);
    }
  });

  app.post('/api/members', (req: Request, res: Response) => {
    try {
      const name = sanitizeText(req.body?.name, 120);
      const email = sanitizeText(req.body?.email, 160).toLowerCase();
      const whatsapp = normalizeWhatsapp(sanitizeText(req.body?.whatsapp, 30));
      const allowedChannels: NotificationChannel[] = ['WhatsApp', 'Email', 'Keduanya'];
      const preferredChannel: NotificationChannel = allowedChannels.includes(
        req.body?.preferredChannel
      )
        ? req.body.preferredChannel
        : 'Keduanya';
      const allowedTypes: MembershipType[] = ['Mahasiswa', 'Umum', 'Peneliti', 'Staf'];
      const membershipType: MembershipType = allowedTypes.includes(req.body?.membershipType)
        ? req.body.membershipType
        : 'Umum';
      const maxLoans = Math.min(15, Math.max(1, Math.floor(Number(req.body?.maxLoans) || 3)));

      if (!name || !isValidEmail(email) || whatsapp.length < 9) {
        res.status(400).json({
          error: 'Nama lengkap, alamat email valid, dan nomor WhatsApp aktif wajib diisi.',
        });
        return;
      }

      const nextSeq = String(db.members.length + 1).padStart(3, '0');
      const newMember: Member = {
        id: `mem-${crypto.randomUUID().slice(0, 8)}`,
        memberCode: `GLB-2026-${nextSeq}`,
        name,
        email,
        whatsapp,
        preferredChannel,
        membershipType,
        status: 'Aktif',
        maxLoans,
        joinedAt: nowIso(),
      };

      db.members.unshift(newMember);
      pushEvent(
        'ANGGOTA_BARU',
        'Anggota Baru Terdaftar',
        `${newMember.name} (${newMember.memberCode}) · Notifikasi ${newMember.preferredChannel}`
      );
      saveDatabase(db);
      broadcastSnapshot();
      res.status(201).json(newMember);
    } catch (err) {
      sendServerError(res, 'pendaftaran anggota (/api/members)', err);
    }
  });

  app.patch('/api/members/:id', (req: Request, res: Response) => {
    try {
      const member = db.members.find((m) => m.id === req.params.id);
      if (!member) {
        res.status(404).json({ error: 'Anggota tidak ditemukan.' });
        return;
      }

      if (req.body?.name !== undefined) {
        const name = sanitizeText(req.body.name, 120);
        if (name) member.name = name;
      }
      if (req.body?.email !== undefined) {
        const email = sanitizeText(req.body.email, 160).toLowerCase();
        if (!isValidEmail(email)) {
          res.status(400).json({ error: 'Format email tidak valid.' });
          return;
        }
        member.email = email;
      }
      if (req.body?.whatsapp !== undefined) {
        const wa = normalizeWhatsapp(sanitizeText(req.body.whatsapp, 30));
        if (wa.length < 9) {
          res.status(400).json({ error: 'Nomor WhatsApp minimal 9 digit.' });
          return;
        }
        member.whatsapp = wa;
      }
      if (req.body?.preferredChannel !== undefined) {
        const allowedChannels: NotificationChannel[] = ['WhatsApp', 'Email', 'Keduanya'];
        if (allowedChannels.includes(req.body.preferredChannel)) {
          member.preferredChannel = req.body.preferredChannel;
        }
      }
      if (req.body?.status !== undefined) {
        const allowedStatuses: MemberStatus[] = ['Aktif', 'Ditangguhkan'];
        if (allowedStatuses.includes(req.body.status)) {
          member.status = req.body.status;
        }
      }
      if (req.body?.membershipType !== undefined) {
        const allowedTypes: MembershipType[] = ['Mahasiswa', 'Umum', 'Peneliti', 'Staf'];
        if (allowedTypes.includes(req.body.membershipType)) {
          member.membershipType = req.body.membershipType;
        }
      }

      saveDatabase(db);
      broadcastSnapshot();
      res.json(member);
    } catch (err) {
      sendServerError(res, 'pembaruan data anggota (/api/members/:id)', err);
    }
  });

  app.post('/api/loans', (req: Request, res: Response) => {
    try {
      const bookId = sanitizeText(req.body?.bookId, 60);
      const memberId = sanitizeText(req.body?.memberId, 60);
      const durationDays = Math.min(
        30,
        Math.max(1, Math.floor(Number(req.body?.durationDays) || 7))
      );
      const notes = sanitizeText(req.body?.notes, 200);

      const book = db.books.find((b) => b.id === bookId);
      if (!book) {
        res.status(404).json({ error: 'Buku tidak ditemukan.' });
        return;
      }
      if (book.availableCopies <= 0) {
        res.status(400).json({ error: 'Stok buku saat ini sedang habis dipinjam.' });
        return;
      }

      const member = db.members.find((m) => m.id === memberId);
      if (!member) {
        res.status(404).json({ error: 'Anggota tidak ditemukan.' });
        return;
      }
      if (member.status !== 'Aktif') {
        res.status(400).json({ error: 'Keanggotaan sedang ditangguhkan.' });
        return;
      }

      const activeMemberLoans = db.loans.filter(
        (l) => l.memberId === member.id && !l.returnedAt
      ).length;
      if (activeMemberLoans >= member.maxLoans) {
        res.status(400).json({
          error: `${member.name} telah mencapai batas maksimal peminjaman (${member.maxLoans} buku).`,
        });
        return;
      }

      const seq = String(db.loans.length + 1).padStart(3, '0');
      const newLoan: Loan = {
        id: `loan-${crypto.randomUUID().slice(0, 8)}`,
        loanCode: `PJM-2611-${seq}`,
        bookId: book.id,
        memberId: member.id,
        borrowedAt: nowIso(),
        dueAt: daysFromNowIso(durationDays),
        returnedAt: null,
        status: 'Dipinjam',
        fineAmount: 0,
        reminderH1SentAt: null,
        reminderDueSentAt: null,
        reminderOverdueSentAt: null,
        notes,
      };

      book.availableCopies -= 1;
      book.borrowCount += 1;
      db.loans.unshift(newLoan);

      pushEvent(
        'PINJAM',
        'Peminjaman Buku Dicatat',
        `${member.name} meminjam "${book.title}" (${durationDays} hari)`
      );

      saveDatabase(db);
      broadcastSnapshot();
      res.status(201).json(newLoan);
    } catch (err) {
      sendServerError(res, 'pencatatan peminjaman (/api/loans)', err);
    }
  });

  app.post('/api/loans/:id/return', (req: Request, res: Response) => {
    try {
      const loan = db.loans.find((l) => l.id === req.params.id);
      if (!loan) {
        res.status(404).json({ error: 'Data peminjaman tidak ditemukan.' });
        return;
      }
      if (loan.returnedAt) {
        res.status(400).json({ error: 'Buku ini sudah dikembalikan sebelumnya.' });
        return;
      }

      const book = db.books.find((b) => b.id === loan.bookId);
      const member = db.members.find((m) => m.id === loan.memberId);

      const now = Date.now();
      const dueMs = safeDateMs(loan.dueAt, now);
      if (dueMs < now) {
        const overdueDays = Math.max(1, Math.ceil((now - dueMs) / MS_PER_DAY));
        loan.fineAmount = overdueDays * db.automationSettings.dailyFinePerDay;
      }

      loan.returnedAt = nowIso();
      loan.status = 'Dikembalikan';
      if (book && book.availableCopies < book.totalCopies) {
        book.availableCopies += 1;
      }

      pushEvent(
        'KEMBALI',
        'Pengembalian Buku',
        `${member?.name ?? 'Anggota'} mengembalikan "${book?.title ?? 'Koleksi'}"`
      );

      saveDatabase(db);
      broadcastSnapshot();
      res.json(loan);
    } catch (err) {
      sendServerError(res, 'pengembalian buku (/api/loans/:id/return)', err);
    }
  });

  app.post('/api/loans/:id/extend', (req: Request, res: Response) => {
    try {
      const loan = db.loans.find((l) => l.id === req.params.id);
      if (!loan) {
        res.status(404).json({ error: 'Data peminjaman tidak ditemukan.' });
        return;
      }
      if (loan.returnedAt) {
        res.status(400).json({ error: 'Tidak dapat memperpanjang pinjaman yang sudah selesai.' });
        return;
      }

      const extraDays = Math.min(14, Math.max(1, Math.floor(Number(req.body?.days) || 7)));
      const baseMs = Math.max(Date.now(), safeDateMs(loan.dueAt, Date.now()));
      loan.dueAt = new Date(baseMs + extraDays * MS_PER_DAY).toISOString();
      loan.status = 'Dipinjam';
      loan.fineAmount = 0;
      loan.reminderH1SentAt = null;
      loan.reminderDueSentAt = null;
      loan.reminderOverdueSentAt = null;

      const book = db.books.find((b) => b.id === loan.bookId);
      const member = db.members.find((m) => m.id === loan.memberId);

      pushEvent(
        'PERPANJANG',
        'Perpanjangan Masa Pinjam',
        `${member?.name ?? 'Anggota'} memperpanjang "${book?.title ?? 'Koleksi'}" (+${extraDays} hari)`
      );

      saveDatabase(db);
      broadcastSnapshot();
      res.json(loan);
    } catch (err) {
      sendServerError(res, 'perpanjangan peminjaman (/api/loans/:id/extend)', err);
    }
  });

  app.post('/api/notifications/send-manual', async (req: Request, res: Response) => {
    try {
      const loanId = sanitizeText(req.body?.loanId, 60);
      const requestedChannel = req.body?.channel as NotificationChannel | undefined;

      const enrichedLoans = enrichLoans(db);
      const loan = enrichedLoans.find((l) => l.id === loanId);
      if (!loan) {
        res.status(404).json({ error: 'Peminjaman tidak ditemukan.' });
        return;
      }

      const targetChannel = requestedChannel || loan.preferredChannel;
      const channels: Array<'WhatsApp' | 'Email'> =
        targetChannel === 'Keduanya' ? ['WhatsApp', 'Email'] : [targetChannel];

      const sent: NotificationLog[] = [];
      for (const ch of channels) {
        if (ch === 'WhatsApp' && !loan.memberWhatsapp) continue;
        if (ch === 'Email' && !loan.memberEmail) continue;
        const log = await dispatchNotification({ loan, channel: ch, triggerType: 'Manual' });
        sent.push(log);
      }

      if (sent.length === 0) {
        res.status(400).json({ error: 'Kontak Email atau WhatsApp anggota belum tersedia.' });
        return;
      }

      pushEvent(
        'NOTIFIKASI',
        'Pengingat Manual Dikirim',
        `${channels.join(' & ')} ke ${loan.memberName} untuk "${loan.bookTitle}"`
      );

      saveDatabase(db);
      broadcastSnapshot();
      res.status(201).json({ sent });
    } catch (err) {
      sendServerError(res, 'pengiriman pengingat manual (/api/notifications/send-manual)', err);
    }
  });

  app.post('/api/notifications/run-sweep', async (_req: Request, res: Response) => {
    try {
      const result = await runAutomationSweep(true);
      res.json(result);
    } catch (err) {
      sendServerError(res, 'pengecekan notifikasi otomatis (/api/notifications/run-sweep)', err);
    }
  });

  app.put('/api/automation-settings', (req: Request, res: Response) => {
    try {
      const body = req.body ?? {};
      if (typeof body.enabled === 'boolean') {
        db.automationSettings.enabled = body.enabled;
      }
      if (body.remindDaysBefore !== undefined) {
        db.automationSettings.remindDaysBefore = Math.min(
          7,
          Math.max(1, Math.floor(Number(body.remindDaysBefore) || 1))
        );
      }
      if (typeof body.remindOnDueDay === 'boolean') {
        db.automationSettings.remindOnDueDay = body.remindOnDueDay;
      }
      if (body.remindOverdueIntervalHours !== undefined) {
        db.automationSettings.remindOverdueIntervalHours = Math.min(
          168,
          Math.max(6, Math.floor(Number(body.remindOverdueIntervalHours) || 24))
        );
      }
      if (body.dailyFinePerDay !== undefined) {
        db.automationSettings.dailyFinePerDay = Math.min(
          100000,
          Math.max(0, Math.floor(Number(body.dailyFinePerDay) || 2000))
        );
      }
      if (body.defaultChannel !== undefined) {
        const allowed: NotificationChannel[] = ['WhatsApp', 'Email', 'Keduanya'];
        if (allowed.includes(body.defaultChannel)) {
          db.automationSettings.defaultChannel = body.defaultChannel;
        }
      }
      if (typeof body.whatsappTemplate === 'string' && body.whatsappTemplate.trim()) {
        db.automationSettings.whatsappTemplate = body.whatsappTemplate.trim().slice(0, 1000);
      }
      if (typeof body.emailSubjectTemplate === 'string' && body.emailSubjectTemplate.trim()) {
        db.automationSettings.emailSubjectTemplate = body.emailSubjectTemplate.trim().slice(0, 200);
      }
      if (typeof body.emailBodyTemplate === 'string' && body.emailBodyTemplate.trim()) {
        db.automationSettings.emailBodyTemplate = body.emailBodyTemplate.trim().slice(0, 2000);
      }

      saveDatabase(db);
      broadcastSnapshot();
      res.json(db.automationSettings);
    } catch (err) {
      sendServerError(res, 'penyimpanan pengaturan otomasi (/api/automation-settings)', err);
    }
  });

  // API 404 handler so /api/* never returns HTML
  app.use('/api', (req: Request, res: Response) => {
    console.warn(`[G-Library API 404] ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      error: `Endpoint API tidak ditemukan: ${req.method} ${req.path}`,
      code: 'API_NOT_FOUND',
    });
  });

  // Global Express error handler
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    sendServerError(res, `${req.method} ${req.originalUrl}`, err);
  });

  return app;
}
