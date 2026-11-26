import { useMemo, useState } from 'react';
import { BookOpen, Plus, Search, X } from 'lucide-react';
import type { Book, BookFormat } from '../types/library';
import { BookCover } from './BookCover';

interface CatalogViewProps {
  books: Book[];
  onBorrowBook: (bookId: string) => void;
  onAddBook: (payload: {
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
  }) => Promise<void>;
}

export function CatalogView({ books, onBorrowBook, onAddBook }: CatalogViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [availabilityFilter, setAvailabilityFilter] = useState<'semua' | 'tersedia'>('semua');
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publisher, setPublisher] = useState('');
  const [year, setYear] = useState(2026);
  const [category, setCategory] = useState('Teknologi & Data');
  const [shelfLocation, setShelfLocation] = useState('Rak B-10');
  const [totalCopies, setTotalCopies] = useState(3);
  const [format, setFormat] = useState<BookFormat>('Cetak & Digital');
  const [description, setDescription] = useState('');

  const categories = useMemo(() => {
    const unique = Array.from(new Set(books.map((b) => b.category)));
    return ['Semua', ...unique];
  }, [books]);

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((book) => {
      if (selectedCategory !== 'Semua' && book.category !== selectedCategory) return false;
      if (availabilityFilter === 'tersedia' && book.availableCopies <= 0) return false;
      if (!q) return true;
      return (
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.isbn.toLowerCase().includes(q) ||
        book.category.toLowerCase().includes(q)
      );
    });
  }, [books, search, selectedCategory, availabilityFilter]);

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onAddBook({
        title,
        author,
        isbn,
        publisher,
        year,
        category,
        shelfLocation,
        totalCopies,
        format,
        description,
      });
      setTitle('');
      setAuthor('');
      setIsbn('');
      setPublisher('');
      setDescription('');
      setShowAddModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan buku.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Katalog Koleksi Perpustakaan
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Telusuri koleksi cetak dan digital, cek ketersediaan eksemplar, dan catat peminjaman.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#25537A] rounded-lg hover:bg-[#1D4466] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tambah Koleksi
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul buku, penulis, atau ISBN..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setAvailabilityFilter('semua')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                availabilityFilter === 'semua'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Koleksi
            </button>
            <button
              type="button"
              onClick={() => setAvailabilityFilter('tersedia')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                availabilityFilter === 'tersedia'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tersedia Sekarang
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#EEF4F9] text-[#1D4466]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Book Grid */}
      {filteredBooks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-slate-900">Koleksi tidak ditemukan</p>
          <p className="text-xs text-slate-500 mt-1">
            Ubah kata kunci pencarian atau tambahkan judul buku baru ke katalog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredBooks.map((book) => {
            const isAvailable = book.availableCopies > 0;
            return (
              <article
                key={book.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex gap-4">
                  <BookCover
                    src={book.coverUrl}
                    title={book.title}
                    author={book.author}
                    className="w-20 h-28"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                      <span>{book.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{book.format}</span>
                    </div>
                    <h2 className="font-display text-base font-semibold text-slate-900 mt-1 leading-snug line-clamp-2">
                      {book.title}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 truncate">{book.author}</p>
                    <p className="text-xs font-mono text-slate-400 mt-2 tabular-nums">
                      ISBN {book.isbn} · {book.shelfLocation}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {book.description}
                </p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-xs tabular-nums">
                    <span
                      className={`font-semibold ${
                        isAvailable ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}
                    >
                      {isAvailable ? 'Tersedia' : 'Sedang Habis'}
                    </span>
                    <span className="text-slate-500">
                      {' '}
                      · {book.availableCopies}/{book.totalCopies} eks
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {book.format !== 'Cetak' && (
                      <button
                        type="button"
                        onClick={() => setPreviewBook(book)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                      >
                        Pratinjau
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => onBorrowBook(book.id)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-[#25537A] rounded-lg hover:bg-[#1D4466] disabled:bg-slate-200 disabled:text-slate-400 transition-colors whitespace-nowrap"
                    >
                      Pinjam
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add Book Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-book-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 id="add-book-title" className="font-display text-lg font-bold text-slate-900">
                Tambah Koleksi Buku Baru
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="mt-4 space-y-4">
              {error && (
                <p className="text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Judul Buku
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Pengantar Kecerdasan Buatan Terapan"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Penulis
                  </label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Nama penulis"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ISBN
                  </label>
                  <input
                    type="text"
                    required
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="978-602-..."
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#25537A]"
                  >
                    <option value="Teknologi & Data">Teknologi & Data</option>
                    <option value="Sains & Filsafat">Sains & Filsafat</option>
                    <option value="Sastra & Fiksi">Sastra & Fiksi</option>
                    <option value="Ekonomi & Bisnis">Ekonomi & Bisnis</option>
                    <option value="Pendidikan & Riset">Pendidikan & Riset</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as BookFormat)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#25537A]"
                  >
                    <option value="Cetak & Digital">Cetak & Digital</option>
                    <option value="Cetak">Cetak</option>
                    <option value="Digital">Digital</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jumlah Eksemplar
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={totalCopies}
                    onChange={(e) => setTotalCopies(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Penerbit
                  </label>
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="Nama penerbit"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tahun Terbit
                  </label>
                  <input
                    type="number"
                    min={1900}
                    max={2030}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Lokasi Rak
                  </label>
                  <input
                    type="text"
                    value={shelfLocation}
                    onChange={(e) => setShelfLocation(e.target.value)}
                    placeholder="Rak B-10"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ringkasan Singkat
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat materi buku..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#25537A]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#25537A] rounded-lg hover:bg-[#1D4466] disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Koleksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Reader Preview Modal */}
      {previewBook && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-book-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <p className="text-xs text-slate-500">
                  Pratinjau Naskah Digital · {previewBook.category}
                </p>
                <h2 id="preview-book-title" className="font-display text-xl font-bold text-slate-900 mt-1">
                  {previewBook.title}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {previewBook.author} · {previewBook.publisher} ({previewBook.year})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewBook(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700"
                aria-label="Tutup pratinjau"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm text-slate-700 leading-relaxed">
              <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-lg flex items-center gap-3 text-xs text-slate-600">
                <BookOpen className="w-4 h-4 text-[#25537A] shrink-0" />
                <span>
                  Akses penuh naskah digital tersedia setelah anggota mencatat peminjaman melalui sistem sirkulasi G-Library.
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1.5">Sinopsis & Ruang Lingkup</h3>
                <p>{previewBook.description}</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1.5">Ikhtisar Bab Pembuka</h3>
                <p className="text-slate-600">
                  Bab 1 membahas kerangka konseptual utama yang mendasari karya ini, mencakup studi kasus terapan, metodologi verifikasi sumber, serta daftar pustaka terkurasi untuk pembaca akademik maupun praktisi.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewBook(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Tutup
              </button>
              {previewBook.availableCopies > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const id = previewBook.id;
                    setPreviewBook(null);
                    onBorrowBook(id);
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#25537A] rounded-lg hover:bg-[#1D4466]"
                >
                  Pinjam Koleksi Ini
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
