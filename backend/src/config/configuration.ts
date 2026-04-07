export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET ?? 'change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },
  database: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/patrimonio?schema=public',
  },
});
