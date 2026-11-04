import { createApp } from './app';
import { createPlayApi } from './billing/play';
import { loadConfig } from './config';
import { createDb } from './db/client';

const config = loadConfig();
const { db, close } = createDb(config.DATABASE_URL);
const app = createApp({ db, config, play: createPlayApi(config.PLAY_PACKAGE_NAME) });

const server = app.listen(config.PORT, () => {
  console.log(`Ascend Protocol API listening on :${config.PORT} (billing: ${config.BILLING_MODE})`);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    server.close(() => void close().then(() => process.exit(0)));
  });
}
