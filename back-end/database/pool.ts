import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Pool de conexões PostgreSQL apontando estritamente para o banco `intranet_dev`.
 * Mantém o isolamento exigido em servidor compartilhado: nenhuma query roda
 * fora deste banco. Dimensionado para ~20 usuários simultâneos.
 */
const schema = process.env.DB_SCHEMA ?? 'public';

export const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'intranet_dev',
  user: process.env.DB_USER ?? 'dev_intranet',
  password: process.env.DB_PASSWORD,
  // Resolve tabelas sem prefixo (ex.: `usuarios`) dentro do schema configurado.
  options: `-c search_path=${schema},public`,
  max: 10,
});
