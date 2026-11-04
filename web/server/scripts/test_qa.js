/**
 * Lightweight smoke checks against seeded PL data.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB, getMongoUri } from '../src/db.js';
import Season from '../src/models/Season.js';
import PlayerSeason from '../src/models/PlayerSeason.js';
import { seedIfEmpty } from '../src/seedOnBoot.js';

dotenv.config();

function check(label, ok, detail) {
  console.log(`${ok ? '✅' : '❌'} ${label}`, detail || '');
  return ok;
}

async function main() {
  console.log('Connecting', getMongoUri());
  await connectDB();
  await seedIfEmpty();

  let pass = 0, total = 0;
  const mark = (l, ok, d) => { total++; if (ok) pass++; check(l, ok, d); };

  const seasons = await Season.find().sort({ Season: 1 }).lean();
  mark('Has 10 seasons 2016–2025', seasons.length === 10 && seasons[0].Season === 2016 && seasons.at(-1).Season === 2025, { n: seasons.length });

  const s2023 = await Season.findOne({ Season: 2023 }).lean();
  mark('2023 has transfer spend > 0', !!s2023 && s2023.AuctionSpendCr > 0, s2023);

  const steals = await PlayerSeason.find({ Season: 2023, PriceSource: 'Auction', Matches: { $gte: 5 }, ValueIndex: { $ne: null } })
    .sort({ ValueIndex: -1 }).limit(1).lean();
  mark('Has a 2023 steal with VI > 1', steals[0]?.ValueIndex > 1, steals[0]);

  const over = await PlayerSeason.find({ Season: 2023, Matches: { $gte: 5 }, OverpayCr: { $ne: null } })
    .sort({ OverpayCr: -1 }).limit(1).lean();
  mark('Has a 2023 overpay', over[0]?.OverpayCr > 0, { name: over[0]?.PlayerName, overpay: over[0]?.OverpayCr });

  console.log(`\n${pass}/${total} checks passed`);
  await mongoose.disconnect();
  process.exit(pass === total ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
