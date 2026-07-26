import express from 'express';

import { isConnected } from '../db/mongo.js';
import { ClaimAudit, Player, Round } from '../db/models.js';

/**
 * Read-only history. Mounted behind the admin key in server.js — these payloads
 * expose cards and the claim trail, which no player may read.
 *
 * Every handler short-circuits when the database is down rather than hanging: a
 * dead Mongo must degrade the history view, never the game.
 */
export const historyRouter = express.Router();

const guard = (res) => {
  if (isConnected()) return false;
  res.status(503).json({ error: 'Database unavailable' });
  return true;
};

/** Recent rounds, summary only — `draws`/`winners` payloads stay out of the list. */
historyRouter.get('/rounds', async (req, res, next) => {
  if (guard(res)) return;
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const rounds = await Round.find()
      .select('-asked')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .maxTimeMS(5000);
    res.json({ rounds });
  } catch (error) {
    next(error);
  }
});

historyRouter.get('/rounds/:id', async (req, res, next) => {
  if (guard(res)) return;
  try {
    const round = await Round.findById(req.params.id).lean().maxTimeMS(5000);
    if (!round) return res.status(404).json({ error: 'Not found' });
    const players = await Player.find({ roundId: round._id })
      .select('playerId name connected joinedAt')
      .lean()
      .maxTimeMS(5000);
    return res.json({ round, players });
  } catch (error) {
    return next(error);
  }
});

/** The anti-cheat trail: every claim, accepted or rejected. */
historyRouter.get('/claims', async (req, res, next) => {
  if (guard(res)) return;
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const filter = {};
    if (req.query.roundId) filter.roundId = req.query.roundId;
    if (req.query.playerId) filter.playerId = req.query.playerId;
    if (req.query.rejected === 'true') filter.accepted = false;

    const claims = await ClaimAudit.find(filter)
      .sort({ at: -1 })
      .limit(limit)
      .lean()
      .maxTimeMS(5000);
    res.json({ claims });
  } catch (error) {
    next(error);
  }
});

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
historyRouter.use((error, _req, res, _next) => {
  console.warn('history route error:', error.message);
  res.status(500).json({ error: 'History query failed' });
});
