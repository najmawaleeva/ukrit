import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface BookCoverProps {
  src: string;
  title: string;
  author: string;
  className?: string;
}

export function BookCover({ src, title, author, className = 'w-14 h-20' }: BookCoverProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`${className} shrink-0 rounded-md border border-slate-200 bg-gradient-to-br from-[#EEF4F9] via-white to-[#E2EBF3] flex flex-col items-center justify-center p-2 text-center select-none`}
        aria-label={`Sampul ${title}`}
      >
        <BookOpen className="w-4 h-4 text-[#25537A] mb-1" />
        <span className="text-[9px] font-semibold leading-tight text-slate-700 line-clamp-2">
          {title}
        </span>
        <span className="text-[8px] text-slate-500 truncate max-w-full mt-0.5">{author}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Sampul buku ${title}`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} shrink-0 rounded-md border border-slate-200 object-cover bg-slate-100`}
    />
  );
}
