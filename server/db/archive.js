/**
 * archive.js — the immutable paper archive.
 *
 * Seeds the 150 printed boards and the three PDFs into MongoDB on first boot,
 * and AFTER that treats the database as the single source of truth: seeding
 * never overwrites, and the server swaps its in-memory registry for whatever
 * the archive holds. Games opening, closing and resetting never touch any of
 * this — that is the entire point.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isConnected } from './mongo.js';
import { PaperBoard, PrintFile } from './models.js';

const PRINT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../print');

export const printFileName = (size) => `shekel-bingo-${size}x${size}.pdf`;
export const printFilePath = (size) => path.join(PRINT_DIR, printFileName(size));

/**
 * Ensure the archive exists, then return the authoritative board list (or null
 * when the database is unavailable — the caller keeps its bundled copy).
 */
export async function syncPaperArchive(bundledBoards) {
  if (!isConnected()) return null;

  try {
    // Boards: seed once, then always read back from the archive.
    const count = await PaperBoard.countDocuments().maxTimeMS(5000);
    if (count === 0) {
      await PaperBoard.insertMany(
        bundledBoards.map((b) => ({ boardId: b.id, size: b.size, cells: b.cells })),
        { ordered: false },
      );
      console.log(`🗄️  Paper archive seeded: ${bundledBoards.length} boards.`);
    }

    // PDFs: store whichever exist on disk and are not archived yet.
    for (const size of [3, 4, 5]) {
      const name = printFileName(size);
      const exists = await PrintFile.exists({ name });
      if (!exists && existsSync(printFilePath(size))) {
        const data = readFileSync(printFilePath(size));
        await PrintFile.create({ name, data, bytes: data.length });
        console.log(`🗄️  Archived ${name} (${Math.round(data.length / 1024)} KB).`);
      }
    }

    const stored = await PaperBoard.find().lean().maxTimeMS(8000);
    return stored.map((b) => ({ id: b.boardId, size: b.size, cells: b.cells }));
  } catch (error) {
    console.warn(`⚠️  Paper archive sync failed (${error.message}). Using bundled boards.`);
    return null;
  }
}

/** The archived PDF, or null — the route falls back to the bundled file. */
export async function loadPrintFile(size) {
  if (!isConnected()) return null;
  try {
    return await PrintFile.findOne({ name: printFileName(size) }).lean().maxTimeMS(8000);
  } catch {
    return null;
  }
}
