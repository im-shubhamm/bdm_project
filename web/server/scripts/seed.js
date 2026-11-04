/**
 * seed.js — Load all processed JSON files into MongoDB (explicit reseed).
 *
 * Usage:  node scripts/seed.js
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import Player from '../src/models/Player.js';
import Team from '../src/models/Team.js';
import Season from '../src/models/Season.js';
import TeamSeason from '../src/models/TeamSeason.js';
import PlayerSeason from '../src/models/PlayerSeason.js';
import AuctionBuy from '../src/models/AuctionBuy.js';
import TeamMatch from '../src/models/TeamMatch.js';
import UnsoldPlayer from '../src/models/UnsoldPlayer.js';
import { connectDB, getMongoUri } from '../src/db.js';

dotenv.config();

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

async function seed() {
  console.log(`\n⚽ Connecting to ${getMongoUri()} …`);
  await connectDB();
  console.log('   Connected.\n');

  for (const { model, file } of COLLECTIONS) {
    const path = join(DATA_DIR, file);
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    await model.collection.drop().catch(() => {});
    const result = await model.insertMany(data, { ordered: false });
    console.log(`   ✅ ${model.collection.name}: ${result.length} docs from ${file}`);
  }

  await Promise.all(COLLECTIONS.map(({ model }) => model.createIndexes()));
  console.log('\n   📇 Indexes created.');

  const s2023 = await Season.findOne({ Season: 2023 });
  if (s2023) {
    console.log(`\n   🔍 Sanity — 2023: ${s2023.PlayersBought} buys, £${s2023.AuctionSpendCr}m spend`);
  }

  await mongoose.disconnect();
  console.log('\n🏁 Seed complete.\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
