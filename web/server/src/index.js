import app from './app.js';
import { connectDB } from './db.js';
import { seedIfEmpty } from './seedOnBoot.js';

const PORT = Number(process.env.PORT || 43151);
const HOST = process.env.HOST || '0.0.0.0';

connectDB()
  .then(async () => {
    console.log('Connected to MongoDB');
    await seedIfEmpty();
    app.listen(PORT, HOST, () => console.log(`API http://${HOST}:${PORT}`));
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
