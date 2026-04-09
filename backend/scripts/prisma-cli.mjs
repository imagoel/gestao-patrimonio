import { spawnSync } from 'node:child_process';

const prismaVersion = '7.7.0';
const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const prismaArgs = process.argv.slice(2);

const result = spawnSync(
  command,
  [
    'exec',
    '--yes',
    `--package=prisma@${prismaVersion}`,
    '--',
    'prisma',
    ...prismaArgs,
  ],
  {
    stdio: 'inherit',
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
