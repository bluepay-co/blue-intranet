import path from 'path';
import fs from 'fs';
import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import {
  listarVitrine,
  listarAdmin,
  buscarPerfil,
  criarPerfil,
  editarPerfil,
  deletarPerfil,
  alternarPublicacao,
  criarBloco,
  editarBloco,
  deletarBloco,
  reordenarBlocos,
  type PerfilEntrada,
} from '../services/bluelover.service';

const UPLOAD_DIR = 'bluelovers';

type Arquivos = Record<string, Express.Multer.File[]> | undefined;

/** Valida o parâmetro de rota antes de qualquer acesso ao banco. */
function lerId(req: Request, param = 'id'): number {
  const id = Number(req.params[param]);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Identificador inválido.', 400);
  return id;
}

/** Path relativo do arquivo enviado no campo informado, ou null. */
function pathUpload(arquivos: Arquivos, campo: string): string | null {
  const arquivo = arquivos?.[campo]?.[0];
  return arquivo ? `/uploads/${UPLOAD_DIR}/${arquivo.filename}` : null;
}

/**
 * Aceita apenas paths que este módulo gerou. Os campos `*_url` chegam pelo body
 * (o front reenvia o path antigo quando a imagem não muda), ou seja: são entrada
 * controlada pelo cliente que acaba num `fs.unlink`. Sem esta checagem, um
 * `../../` no body viraria path traversal na exclusão.
 */
const PATH_OK = new RegExp(`^/uploads/${UPLOAD_DIR}/[A-Za-z0-9._-]+$`);

function sanitizarPath(valor?: string): string | null {
  const bruto = typeof valor === 'string' ? valor.trim() : '';
  return bruto && PATH_OK.test(bruto) ? bruto : null;
}

/** Remove do disco os arquivos cujos paths deixaram de ser referenciados. */
function apagarArquivos(paths: (string | null)[]) {
  paths.forEach((relativo) => {
    if (!relativo || !PATH_OK.test(relativo)) return;
    fs.unlink(path.join(__dirname, '..', relativo), () => {
      /* ignora erro se o arquivo já não existir */
    });
  });
}

/**
 * Descarta os uploads desta requisição. Usado quando a validação falha DEPOIS
 * de o multer já ter gravado os arquivos — sem isso, cada erro de formulário
 * deixaria lixo permanente em uploads/bluelovers.
 */
function limparUploads(req: Request) {
  const doCampo = Object.values((req.files as Arquivos) ?? {}).flat();
  const unico = req.file ? [req.file] : [];
  [...doCampo, ...unico].forEach((arquivo) => {
    fs.unlink(arquivo.path, () => {
      /* best effort */
    });
  });
}

/** Lê os campos textuais do perfil, resolvendo arquivo novo × path reenviado. */
function lerPerfil(req: Request): PerfilEntrada {
  const arquivos = req.files as Arquivos;
  const { nome, cargo, setor, frase, ordem, foto_capa_url, foto_destaque_url } = req.body as {
    nome?: string;
    cargo?: string;
    setor?: string;
    frase?: string;
    ordem?: string;
    foto_capa_url?: string;
    foto_destaque_url?: string;
  };

  return {
    nome: nome ?? '',
    cargo: cargo ?? null,
    setor: setor ?? null,
    frase: frase ?? null,
    fotoCapaUrl: pathUpload(arquivos, 'foto_capa') ?? sanitizarPath(foto_capa_url),
    fotoDestaqueUrl: pathUpload(arquivos, 'foto_destaque') ?? sanitizarPath(foto_destaque_url),
    ordem: Number(ordem ?? 0),
  };
}

// ─── Vitrine pública ─────────────────────────────────────────────────────────

/** GET /api/bluelovers — Vitrine com os perfis publicados. */
export async function getVitrine(_req: Request, res: Response) {
  try {
    const bluelovers = await listarVitrine();
    return res.status(200).json({ bluelovers });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[bluelover.controller] getVitrine:', err);
    return res.status(500).json({ message: 'Erro interno ao carregar os Bluelovers.' });
  }
}

/** GET /api/bluelovers/:id — Perfil publicado com suas seções. */
export async function getPerfil(req: Request, res: Response) {
  try {
    const bluelover = await buscarPerfil(lerId(req), true);
    return res.status(200).json({ bluelover });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[bluelover.controller] getPerfil:', err);
    return res.status(500).json({ message: 'Erro interno ao carregar o perfil.' });
  }
}

// ─── Painel do Marketing ─────────────────────────────────────────────────────

/** GET /api/bluelovers/admin — Todos os perfis, inclusive rascunhos. */
export async function getAdminLista(_req: Request, res: Response) {
  try {
    const bluelovers = await listarAdmin();
    return res.status(200).json({ bluelovers });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[bluelover.controller] getAdminLista:', err);
    return res.status(500).json({ message: 'Erro interno ao carregar os perfis.' });
  }
}

/** GET /api/bluelovers/admin/:id — Perfil para edição (rascunho incluso). */
export async function getAdminPerfil(req: Request, res: Response) {
  try {
    const bluelover = await buscarPerfil(lerId(req), false);
    return res.status(200).json({ bluelover });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[bluelover.controller] getAdminPerfil:', err);
    return res.status(500).json({ message: 'Erro interno ao carregar o perfil.' });
  }
}

/** POST /api/bluelovers/admin — Cria um perfil (multipart/form-data). */
export async function postCriarPerfil(req: Request, res: Response) {
  try {
    const bluelover = await criarPerfil(req.usuario!.id, lerPerfil(req));
    return res.status(201).json({ bluelover });
  } catch (err) {
    limparUploads(req);
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[bluelover.controller] postCriarPerfil:', err);
    return res.status(500).json({ message: 'Erro interno ao criar o perfil.' });
  }
}

/** PUT /api/bluelovers/admin/:id — Edita o perfil (multipart/form-data). */
export async function putEditarPerfil(req: Request, res: Response) {
  try {
    const id = lerId(req);
    const { orfas } = await editarPerfil(id, lerPerfil(req));
    apagarArquivos(orfas);
    return res.status(200).json({ bluelover: { id } });
  } catch (err) {
    limparUploads(req);
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[bluelover.controller] putEditarPerfil:', err);
    return res.status(500).json({ message: 'Erro interno ao editar o perfil.' });
  }
}

/** DELETE /api/bluelovers/admin/:id — Remove o perfil, suas seções e as imagens. */
export async function deletePerfil(req: Request, res: Response) {
  try {
    const paths = await deletarPerfil(lerId(req));
    apagarArquivos(paths);
    return res.status(200).json({ message: 'Perfil removido.' });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[bluelover.controller] deletePerfil:', err);
    return res.status(500).json({ message: 'Erro interno ao remover o perfil.' });
  }
}

/** PATCH /api/bluelovers/admin/:id/publicar — Alterna rascunho/publicado. */
export async function patchPublicar(req: Request, res: Response) {
  try {
    const resultado = await alternarPublicacao(lerId(req));
    return res.status(200).json(resultado);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[bluelover.controller] patchPublicar:', err);
    return res.status(500).json({ message: 'Erro interno ao alterar a publicação.' });
  }
}

// ─── Seções do perfil ────────────────────────────────────────────────────────

/** POST /api/bluelovers/admin/:id/blocos — Adiciona uma seção ao perfil. */
export async function postCriarBloco(req: Request, res: Response) {
  try {
    const { titulo, texto } = req.body as { titulo?: string; texto?: string };
    const fotoUrl = req.file ? `/uploads/${UPLOAD_DIR}/${req.file.filename}` : null;

    const bloco = await criarBloco(lerId(req), titulo ?? '', texto ?? '', fotoUrl);
    return res.status(201).json({ bloco });
  } catch (err) {
    limparUploads(req);
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[bluelover.controller] postCriarBloco:', err);
    return res.status(500).json({ message: 'Erro interno ao criar a seção.' });
  }
}

/** PUT /api/bluelovers/admin/blocos/:blocoId — Edita uma seção. */
export async function putEditarBloco(req: Request, res: Response) {
  try {
    const { titulo, texto, foto_url } = req.body as {
      titulo?: string;
      texto?: string;
      foto_url?: string;
    };
    // Arquivo novo tem precedência; senão vale o path reenviado pelo front.
    const fotoUrl = req.file
      ? `/uploads/${UPLOAD_DIR}/${req.file.filename}`
      : sanitizarPath(foto_url);

    const { bloco, orfa } = await editarBloco(
      lerId(req, 'blocoId'),
      titulo ?? '',
      texto ?? '',
      fotoUrl,
    );
    apagarArquivos([orfa]);
    return res.status(200).json({ bloco });
  } catch (err) {
    limparUploads(req);
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[bluelover.controller] putEditarBloco:', err);
    return res.status(500).json({ message: 'Erro interno ao editar a seção.' });
  }
}

/** DELETE /api/bluelovers/admin/blocos/:blocoId — Remove a seção e sua foto. */
export async function deleteBloco(req: Request, res: Response) {
  try {
    const fotoUrl = await deletarBloco(lerId(req, 'blocoId'));
    apagarArquivos([fotoUrl]);
    return res.status(200).json({ message: 'Seção removida.' });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[bluelover.controller] deleteBloco:', err);
    return res.status(500).json({ message: 'Erro interno ao remover a seção.' });
  }
}

/** PATCH /api/bluelovers/admin/:id/blocos/ordem — Reordena as seções. */
export async function patchOrdemBlocos(req: Request, res: Response) {
  try {
    const { ids } = req.body as { ids?: number[] };
    const ordenados = await reordenarBlocos(lerId(req), ids ?? []);
    return res.status(200).json({ ordenados });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[bluelover.controller] patchOrdemBlocos:', err);
    return res.status(500).json({ message: 'Erro interno ao reordenar as seções.' });
  }
}
