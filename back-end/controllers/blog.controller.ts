import path from 'path';
import fs from 'fs';
import type { Request, Response } from 'express';
import { AppError } from '../utils/app-error';
import {
  listarFeed,
  listarAdmin,
  criarPost,
  editarPost,
  deletarPost,
  togglePublicar,
  reagirPost,
} from '../services/blog.service';

/** GET /api/blog — Feed público de posts publicados. */
export async function getFeed(req: Request, res: Response) {
  try {
    const posts = await listarFeed(req.usuario!.id);
    return res.status(200).json({ posts });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[blog.controller] getFeed:', err);
    return res.status(500).json({ message: 'Erro interno ao carregar o feed.' });
  }
}

/** GET /api/blog/admin/posts — Todos os posts (admin MARKETING). */
export async function getAdminPosts(req: Request, res: Response) {
  try {
    const posts = await listarAdmin(req.usuario!.id);
    return res.status(200).json({ posts });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[blog.controller] getAdminPosts:', err);
    return res.status(500).json({ message: 'Erro interno ao carregar os posts.' });
  }
}

/** POST /api/blog/admin/posts — Cria novo post (multipart/form-data). */
export async function postCriarPost(req: Request, res: Response) {
  try {
    const { titulo, conteudo, publicado } = req.body as {
      titulo?: string;
      conteudo?: string;
      publicado?: string;
    };
    const imagemUrl = req.file ? `/uploads/blog/${req.file.filename}` : null;

    const post = await criarPost(
      req.usuario!.id,
      titulo ?? '',
      conteudo ?? '',
      imagemUrl,
      publicado === 'true',
    );
    return res.status(201).json({ post });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[blog.controller] postCriarPost:', err);
    return res.status(500).json({ message: 'Erro interno ao criar o post.' });
  }
}

/** PUT /api/blog/admin/posts/:id — Edita um post existente (multipart/form-data). */
export async function putEditarPost(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const { titulo, conteudo, publicado, imagem_url } = req.body as {
      titulo?: string;
      conteudo?: string;
      publicado?: string;
      imagem_url?: string;
    };

    // Se um novo arquivo foi enviado, usa o novo path; senão, usa o valor do body.
    const imagemUrl = req.file
      ? `/uploads/blog/${req.file.filename}`
      : (imagem_url?.trim() || null);

    await editarPost(id, titulo ?? '', conteudo ?? '', imagemUrl, publicado === 'true');
    return res.status(200).json({ post: { id } });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[blog.controller] putEditarPost:', err);
    return res.status(500).json({ message: 'Erro interno ao editar o post.' });
  }
}

/** DELETE /api/blog/admin/posts/:id — Remove um post e seu arquivo físico. */
export async function deletePost(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const imagemUrl = await deletarPost(id);

    if (imagemUrl) {
      const filePath = path.join(__dirname, '..', imagemUrl);
      fs.unlink(filePath, () => { /* ignora erro se arquivo não existir */ });
    }

    return res.status(200).json({ message: 'Post removido.' });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[blog.controller] deletePost:', err);
    return res.status(500).json({ message: 'Erro interno ao deletar o post.' });
  }
}

/** PATCH /api/blog/admin/posts/:id/publicar — Alterna publicado/rascunho. */
export async function patchTogglePublicar(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const result = await togglePublicar(id);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[blog.controller] patchTogglePublicar:', err);
    return res.status(500).json({ message: 'Erro interno ao alterar publicação.' });
  }
}

/** POST /api/blog/:postId/reagir — Adiciona/troca/remove reação do usuário. */
export async function postReagir(req: Request, res: Response) {
  try {
    const postId = Number(req.params.postId);
    const { tipo } = req.body as { tipo?: string };
    if (!tipo) return res.status(400).json({ message: 'Tipo de reação é obrigatório.' });

    const result = await reagirPost(postId, req.usuario!.id, tipo);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message });
    console.error('[blog.controller] postReagir:', err);
    return res.status(500).json({ message: 'Erro interno ao registrar reação.' });
  }
}
