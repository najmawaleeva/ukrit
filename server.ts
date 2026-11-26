import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createLibraryApiApp, runAutomationSweep } from './server/libraryApp.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

async function startServer(): Promise<void> {
  const app = createLibraryApiApp();

  // Periodic background automation check every 60 seconds
  setInterval(() => {
    void runAutomationSweep(false).catch((err) => {
      console.error('[G-Library Scheduler] Gagal menjalankan pengecekan otomatis:', err);
    });
  }, 60 * 1000);

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`G-Library server running at http://localhost:${PORT}`);
  });
}

void startServer();
