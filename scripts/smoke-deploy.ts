const BASE = process.env.DEPLOY_URL ?? 'https://ticketa-dev.vercel.app';
const paths = ['/', '/signup', '/login', '/catalog', '/no-access'];

async function main() {
  for (const p of paths) {
    try {
      const r = await fetch(BASE + p, { redirect: 'manual' });
      const loc = r.headers.get('location') ?? '';
      console.log(`${p.padEnd(20)} ${r.status}${loc ? ' → ' + loc : ''}`);
    } catch (e) {
      console.log(`${p.padEnd(20)} ERR ${(e as Error).message}`);
    }
  }
}
main();
