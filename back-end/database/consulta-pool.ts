import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Pool somente leitura para o banco bluepay3_production.
 * NUNCA usar para INSERT/UPDATE/DELETE — credencial tem permissão apenas de SELECT.
 */
export const consultaPool = new Pool({
  host:     process.env.CONSULTA_DB_HOST,
  port:     Number(process.env.CONSULTA_DB_PORT ?? 5432),
  database: process.env.CONSULTA_DB_NAME,
  user:     process.env.CONSULTA_DB_USER,
  password: process.env.CONSULTA_DB_PASSWORD,
  options:  `-c search_path=${process.env.CONSULTA_DB_SCHEMA ?? 'public'},public -c statement_timeout=30000`,
  ssl:      { rejectUnauthorized: false },
  max: 5,
  // Falha rápido quando o banco de produção está inacessível (ex.: fora da VPN),
  // em vez de pendurar a request indefinidamente esperando a conexão TCP.
  connectionTimeoutMillis: 10000,
});
