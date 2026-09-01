/**
 * Flips prisma/schema.prisma between sqlite (local dev) and postgresql (production).
 *
 *   node scripts/switch-db.js sqlite   -> provider = "sqlite"
 *   node scripts/switch-db.js postgres -> provider = "postgresql"
 *
 * Vercel build runs `node scripts/switch-db.js postgres && prisma generate && next build`
 * because serverless PostgreSQL is required in production, while local dev stays on SQLite.
 */
const fs = require('fs');
const path = require('path');

const target = (process.argv[2] || '').toLowerCase();
if (!['sqlite', 'postgres'].includes(target)) {
  console.error('Usage: node scripts/switch-db.js <sqlite|postgres>');
  process.exit(1);
}

const file = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(file, 'utf8');

const provider = target === 'postgres' ? 'postgresql' : 'sqlite';
schema = schema.replace(/provider = "(sqlite|postgresql)"/, `provider = "${provider}"`);

fs.writeFileSync(file, schema, 'utf8');
console.log(`prisma provider -> ${provider}`);
