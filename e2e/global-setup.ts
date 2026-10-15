import { execSync } from 'node:child_process';

/**
 * Optional reset of the test database before a run, e.g.
 * E2E_RESET_CMD='docker exec backend-db-1 psql -U owner -d looply_fe -c "TRUNCATE workday, customer CASCADE"'
 */
export default function globalSetup() {
  const cmd = process.env.E2E_RESET_CMD;
  if (cmd) execSync(cmd, { stdio: 'inherit' });
}
