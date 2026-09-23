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
  atualizarFotosPerfil,
  blueloverDoBloco,
  type PerfilEntrada,
  type BlocoEntrada,
} from '../services/bluelover.service';

const UPLOAD_DIR = 'bluelovers';
/** Destino provisório de quem sobe antes de existir um perfil dono do arquivo. */
export const PASTA_TEMP = '_tmp';
const BASE_UPLOAD = path.join(__dirname, '..', 'uploads', UPLOAD_DIR);

const urlDaPasta = (pasta: string, nome: string) => `/uploads/${UPLOAD_DIR}/${pasta}/${nome}`;

/** Move o arquivo de `_tmp` para a pasta do perfil e devolve o novo path. */
function moverParaPerfil(relativo: string | null, blueloverId: number): string | null {
  if (!relativo?.includes(`/${PASTA_TEMP}/`)) return relativo;

  const nome = path.basename(relativo);
  const destino = path.join(BASE_UPLOAD, String(blueloverId));
  fs.mkdirSync(destino, { recursive: true });
  fs.renameSync(path.join(BASE_UPLOAD, PASTA_TEMP, nome), path.join(destino, nome));
  return urlDaPasta(String(blueloverId), nome);
}

type Arquivos = Record<string, Express.Multer.File[]> | undefined;

/** Valida o parâmetro de rota antes de qualquer acesso ao banco. */
function lerId(req: Request, param = 'id'): number {
  const id = Number(req.params[param]);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Identificador inválido.', 400);
  return id;
}

/** Path relativo de um arquivo recém-enviado, respeitando a pasta de destino. */
function pathDoUpload(arquivo: Express.Multer.File): string {
  return urlDaPasta(path.basename(arquivo.destination), arquivo.filename);
}

/** Path relativo do arquivo enviado no campo informado, ou null. */
function pathUpload(arquivos: Arquivos, campo: string): string | null {
  const arquivo = arquivos?.[campo]?.[0];
  return arquivo ? pathDoUpload(arquivo) : null;
}

/**
 * Aceita apenas paths que este módulo gerou. Os campos `*_url` chegam pelo body
 * (o front reenvia o path antigo quando a imagem não muda), ou seja: são entrada
 * controlada pelo cliente que acaba num `fs.unlink`. Sem esta checagem, um
 * `../../` no body viraria path traversal na exclusão.
 */
// Aceita a pasta do perfil, a temporária e os arquivos soltos de antes da separação.
const PATH_OK = new RegExp(`^/uploads/${UPLOAD_DIR}/(?:\\d+/|${PASTA_TEMP}/)?[A-Za-z0-9._-]+$`);

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

/**
 * O multipart entrega tudo como string: listas e mapas chegam em JSON.
 * Entrada malformada vira erro de validação, não 500.
 */
function lerJson(valor: unknown, mensagem: string): unknown {
  if (typeof valor !== 'string' || !valor.trim()) return undefined;
  try {
    return JSON.parse(valor);
  } catch {
    throw new AppError(mensagem, 400);
  }
}

/** Lê os campos textuais do perfil, resolvendo arquivo novo × path reenviado. */
function lerPerfil(req: Request): PerfilEntrada {
  const arquivos = req.files as Arquivos;
  const c = req.body as Record<string, string | undefined>;

  return {
    nome: c.nome ?? '',
    cargo: c.cargo ?? null,
    setor: c.setor ?? null,
    frase: c.frase ?? null,
    fotoCapaUrl: pathUpload(arquivos, 'foto_capa') ?? sanitizarPath(c.foto_capa_url),
    fotoDestaqueUrl: pathUpload(arquivos, 'foto_destaque') ?? sanitizarPath(c.foto_destaque_url),
    ordem: Number(c.ordem ?? 0),
    apelido: c.apelido ?? null,
    dataNascimento: c.data_nascimento ?? null,
    bio: c.bio ?? null,
    habilidades: lerJson(c.habilidades, 'Habilidades inválidas.') ?? [],
    talento: c.talento ?? null,
    gostoComida: c.gosto_comida ?? null,
    gostoAssiste: c.gosto_assiste ?? null,
    gostoMusica: c.gosto_musica ?? null,
    gostoCor: c.gosto_cor ?? null,
    gostoRedeSocial: c.gosto_rede_social ?? null,
    gostoEmoji: c.gosto_emoji ?? null,
    hobby: c.hobby ?? null,
    presentePerfeito: c.presente_perfeito ?? null,
    rotulosGostos: lerJson(c.rotulos_gostos, 'Títulos dos gostos inválidos.'),
    viagemFavoritaTexto: c.viagem_favorita_texto ?? null,
    viagemFavoritaFotoUrl:
      pathUpload(arquivos, 'foto_viagem') ?? sanitizarPath(c.viagem_favorita_foto_url),
    viagemSonho: c.viagem_sonho ?? null,
    viagemSonhoFotoUrl:
      pathUpload(arquivos, 'foto_viagem_sonho') ?? sanitizarPath(c.viagem_sonho_foto_url),
    inspiracaoTexto: c.inspiracao_texto ?? null,
    inspiracaoFotoUrl:
      pathUpload(arquivos, 'foto_inspiracao') ?? sanitizarPath(c.inspiracao_foto_url),
    bluepayPessoaTexto: c.bluepay_pessoa_texto ?? null,
    bluepayPessoaFotoUrl:
      pathUpload(arquivos, 'foto_bluepay') ?? sanitizarPath(c.bluepay_pessoa_foto_url),
    maisSobreMim: c.mais_sobre_mim ?? null,
  };
}

/** Campos de uma seção (card de conquista ou momento da timeline). */
function lerBloco(req: Request, fotoUrl: string | null): BlocoEntrada {
  const c = req.body as Record<string, string | undefined>;
  return {
    tipo: c.tipo ?? null,
    chave: c.chave ?? null,
    titulo: c.titulo ?? '',
    texto: c.texto ?? '',
    rotuloData: c.rotulo_data ?? null,
    fotoUrl,
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
    const entrada = lerPerfil(req);
    const bluelover = await criarPerfil(req.usuario!.id, entrada);

    // Só agora existe o id que dá nome à pasta do perfil.
    await atualizarFotosPerfil(bluelover.id, {
      fotoCapaUrl: moverParaPerfil(entrada.fotoCapaUrl, bluelover.id),
      fotoDestaqueUrl: moverParaPerfil(entrada.fotoDestaqueUrl, bluelover.id),
      viagemFavoritaFotoUrl: moverParaPerfil(entrada.viagemFavoritaFotoUrl, bluelover.id),
      viagemSonhoFotoUrl: moverParaPerfil(entrada.viagemSonhoFotoUrl, bluelover.id),
      inspiracaoFotoUrl: moverParaPerfil(entrada.inspiracaoFotoUrl, bluelover.id),
      bluepayPessoaFotoUrl: moverParaPerfil(entrada.bluepayPessoaFotoUrl, bluelover.id),
    });

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
    const id = lerId(req);
    const paths = await deletarPerfil(id);
    apagarArquivos(paths);
    fs.rm(path.join(BASE_UPLOAD, String(id)), { recursive: true, force: true }, () => {
      /* a pasta pode nem existir se o perfil não tinha imagens */
    });
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
    const fotoUrl = req.file ? pathDoUpload(req.file) : null;
    const bloco = await criarBloco(lerId(req), lerBloco(req, fotoUrl));
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
    // Arquivo novo tem precedência; senão vale o path reenviado pelo front.
    const fotoUrl = req.file
      ? pathDoUpload(req.file)
      : sanitizarPath((req.body as { foto_url?: string }).foto_url);

    const blocoId = lerId(req, 'blocoId');
    const destino = moverParaPerfil(fotoUrl, await blueloverDoBloco(blocoId));

    const { bloco, orfa } = await editarBloco(blocoId, lerBloco(req, destino));
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
