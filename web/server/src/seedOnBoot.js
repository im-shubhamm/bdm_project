/**
 * seedOnBoot.js — Load data/processed JSON when the DB has no seasons yet.
 * Keeps local demo one-command: npm run dev (no separate seed step required).
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import Player from './models/Player.js';
import Team from './models/Team.js';
import Season from './models/Season.js';
import TeamSeason from './models/TeamSeason.js';
import PlayerSeason from './models/PlayerSeason.js';
import AuctionBuy from './models/AuctionBuy.js';
import TeamMatch from './models/TeamMatch.js';
import UnsoldPlayer from './models/UnsoldPlayer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', 'data', 'processed');

const COLLECTIONS = [
  { model: Player, file: 'players.json' },
  { model: Team, file: 'teams.json' },
  { model: Season, file: 'seasons.json' },
  { model: TeamSeason, file: 'team_seasons.json' },
  { model: PlayerSeason, file: 'player_seasons.json' },
  { model: AuctionBuy, file: 'auction_buys.json' },
  { model: TeamMatch, file: 'team_matches.json' },
  { model: UnsoldPlayer, file: 'unsold_players.json' },
];

export async function seedIfEmpty() {
  const count = await Season.countDocuments();
  if (count > 0) {
    console.log(`   📦 DB already seeded (${count} seasons)`);
    return;
  }
  console.log('   🌱 Seeding from data/processed …');
  for (const { model, file } of COLLECTIONS) {
    const path = join(DATA_DIR, file);
    if (!existsSync(path)) throw new Error(`Missing ${path}`);
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    await model.collection.drop().catch(() => {});
    await model.insertMany(data, { ordered: false });
    console.log(`      ✅ ${model.collection.name}: ${data.length}`);
  }
  await Promise.all(COLLECTIONS.map(({ model }) => model.createIndexes()));
  console.log('   🌱 Seed complete');
}
