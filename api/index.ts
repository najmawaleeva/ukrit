import type { Request, Response } from 'express';
import { createLibraryApiApp } from '../server/libraryApp.ts';

const app = createLibraryApiApp();

export default function handler(req: Request, res: Response): void {
  const rawUrl = req.url || '/';
  try {
    const parsed = new URL(rawUrl, 'http://localhost');
    const rewrittenPath = parsed.searchParams.get('__path');
    if (rewrittenPath !== null) {
      parsed.searchParams.delete('__path');
      const qs = parsed.searchParams.toString();
      req.url = `/api/${rewrittenPath}${qs ? `?${qs}` : ''}`;
    } else if (!rawUrl.startsWith('/api')) {
      req.url = `/api${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
    }
  } catch (err) {
    console.error('[G-Library Vercel Handler] Gagal mem-parsing URL request:', rawUrl, err);
  }

  app(req, res);
}
