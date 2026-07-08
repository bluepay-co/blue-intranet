import crypto from 'crypto';
import { AppError } from './app-error';

/**
 * Criptografia simétrica das mensagens do chat interno.
 *
 * Algoritmo: AES-256-GCM (autenticado — detecta adulteração via auth tag).
 * A chave vem de `CHAT_ENCRYPTION_KEY` (64 caracteres hex = 32 bytes).
 * Gere uma com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * As mensagens NUNCA são persistidas em texto puro: o banco guarda apenas
 * `conteudo_cifrado` (cifra), `iv` (vetor de inicialização) e `auth_tag`, todos em hex.
 */

const ALGORITMO = 'aes-256-gcm';
const TAMANHO_IV = 12; // 96 bits, recomendado para GCM

function obterChave(): Buffer {
  const hex = process.env.CHAT_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new AppError('Chave de criptografia do chat ausente ou inválida no servidor.', 500);
  }
  return Buffer.from(hex, 'hex');
}

export interface PayloadCifradoChat {
  conteudo: string;
  iv: string;
  authTag: string;
}

export function criptografar(texto: string): PayloadCifradoChat {
  const chave = obterChave();
  const iv = crypto.randomBytes(TAMANHO_IV);
  const cipher = crypto.createCipheriv(ALGORITMO, chave, iv);

  const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    conteudo: cifrado.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

export function descriptografar(payload: PayloadCifradoChat): string {
  const chave = obterChave();
  try {
    const decipher = crypto.createDecipheriv(ALGORITMO, chave, Buffer.from(payload.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
    const claro = Buffer.concat([
      decipher.update(Buffer.from(payload.conteudo, 'hex')),
      decipher.final(),
    ]);
    return claro.toString('utf8');
  } catch {
    throw new AppError('Falha ao descriptografar a mensagem do chat.', 500);
  }
}
