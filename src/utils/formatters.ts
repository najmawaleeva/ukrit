export function formatDateId(iso: string | null): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTimeId(iso: string | null): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeId(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} hari lalu`;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function buildWhatsappUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('0')
    ? `62${digits.slice(1)}`
    : digits.startsWith('8')
      ? `62${digits}`
      : digits;
  return `https://wa.me/${encodeURIComponent(normalized)}?text=${encodeURIComponent(message)}`;
}

export function buildMailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
