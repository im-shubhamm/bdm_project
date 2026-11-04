import app from './app.js';

const PORT = Number(process.env.PORT || 43151);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Superstore API on http://${HOST}:${PORT} (json-files)`);
});
