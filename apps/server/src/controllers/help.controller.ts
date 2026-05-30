import type { Request, Response } from 'express';
import { helpService } from '../services/help.service.js';

export const helpController = {
  async exportSearchData(req: Request, res: Response) {
    const { docs, etag } = await helpService.exportForSearch();

    // Return 304 if the client already has the current version.
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res
      .setHeader('ETag', etag)
      .setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      .json(docs);
  },
};
