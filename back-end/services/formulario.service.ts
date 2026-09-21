import { google } from 'googleapis';
import type { forms_v1 } from 'googleapis';
import { pool } from '../database/pool';
import { criarOAuthClient } from '../utils/google-oauth';
import { criarClienteAutenticado, lancarErroGoogle } from '../utils/google-cliente';
import { AppError } from '../utils/app-error';
import type {
  FormularioRegistro,
  FormularioResumo,
  Formulario,
  EntradaFormulario,
  ItemFormulario,
  TipoPergunta,
  ColunaResposta,
  RespostaFormulario,
  RespostasFormulario,
  ColetaEmail,
} from '../models/formulario.model';

const SCOPES_FORMS = [
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/drive.file',
];

const TIPOS: readonly TipoPergunta[] = [
  'texto_curto',
  'paragrafo',
  'multipla_escolha',
  'caixas_selecao',
  'lista_suspensa',
  'escala',
  'data',
  'hora',
];
const TIPOS_ESCOLHA = {
  multipla_escolha: 'RADIO',
  caixas_selecao: 'CHECKBOX',
  lista_suspensa: 'DROP_DOWN',
} as const;
const COLETA_EMAIL: Record<ColetaEmail, string> = {
  nao_coletar: 'DO_NOT_COLLECT',
  verificado: 'VERIFIED',
  informado: 'RESPONDER_INPUT',
};
const ID_GOOGLE = /^[\w-]{1,128}$/;
const MAX_ITENS = 200;
const MAX_OPCOES = 200;

interface RegistroComCriador extends FormularioRegistro {
  criado_por_nome: string;
}

interface EntradaValidada {
  titulo: string;
  descricao: string | null;
  itens: ItemFormulario[];
  /** null = não enviado; mantém o que está no Google. */
  coletaEmail: ColetaEmail | null;
}

// ── Conexão (consentimento incremental dos scopes do Forms) ──────────────────

export async function statusConexao(usuarioId: number): Promise<boolean> {
  const { rows } = await pool.query<{ google_forms_conectado: boolean }>(
    `SELECT google_forms_conectado FROM usuarios WHERE id = $1`,
    [usuarioId],
  );
  if (!rows[0]) throw new AppError('Usuário não encontrado.', 404);
  return rows[0].google_forms_conectado;
}

/** Troca o `code` do consentimento extra e grava os tokens com os scopes do Forms. */
export async function conectarGoogleForms(
  usuarioId: number,
  emailSessao: string,
  code: unknown,
): Promise<void> {
  if (typeof code !== 'string' || code.trim().length === 0) {
    throw new AppError('Código de autorização ausente ou inválido.', 400);
  }

  const oauth = criarOAuthClient();
  let tokens;
  try {
    ({ tokens } = await oauth.getToken(code.trim()));
  } catch {
    throw new AppError('Falha ao validar o código junto ao Google.', 401);
  }

  const concedidos = (tokens.scope ?? '').split(' ');
  if (!SCOPES_FORMS.every((s) => concedidos.includes(s))) {
    throw new AppError('Autorize todas as permissões do Google Forms para continuar.', 403);
  }

  // Impede vincular uma conta Google diferente da sessão.
  oauth.setCredentials(tokens);
  const { data } = await google.oauth2({ version: 'v2', auth: oauth }).userinfo.get();
  if ((data.email ?? '').trim().toLowerCase() !== emailSessao.toLowerCase()) {
    throw new AppError('Conecte a mesma conta Google usada no login da intranet.', 403);
  }

  await pool.query(
    `UPDATE usuarios
        SET google_access_token    = $1,
            google_refresh_token   = COALESCE($2, google_refresh_token),
            google_forms_conectado = TRUE,
            atualizado_em          = now()
      WHERE id = $3`,
    [tokens.access_token ?? null, tokens.refresh_token ?? null, usuarioId],
  );
}

// ── Validação ────────────────────────────────────────────────────────────────

function texto(valor: unknown, campo: string, max: number): string {
  if (valor != null && typeof valor !== 'string') {
    throw new AppError(`${campo} inválido.`, 400);
  }
  const limpo = (valor ?? '').trim();
  if (limpo.length > max) throw new AppError(`${campo} excede ${max} caracteres.`, 400);
  return limpo;
}

function exigirTexto(valor: unknown, campo: string, max: number): string {
  const limpo = texto(valor, campo, max);
  if (!limpo) throw new AppError(`${campo} é obrigatório.`, 400);
  return limpo;
}

function textoOpcional(valor: unknown, campo: string, max: number): string | null {
  return texto(valor, campo, max) || null;
}

function validarItem(bruto: unknown, pos: number): ItemFormulario {
  const rotulo = `Pergunta ${pos + 1}`;
  if (!bruto || typeof bruto !== 'object') throw new AppError(`${rotulo}: formato inválido.`, 400);
  const i = bruto as Record<string, unknown>;

  const id = i.id == null ? undefined : String(i.id);
  if (id !== undefined && !ID_GOOGLE.test(id)) {
    throw new AppError(`${rotulo}: identificador inválido.`, 400);
  }

  if (i.tipo === 'nao_suportado') {
    if (!id) throw new AppError(`${rotulo}: item não suportado sem identificador.`, 400);
    return { id, tipo: 'nao_suportado', titulo: '', descricao: null, obrigatoria: false };
  }
  if (!TIPOS.includes(i.tipo as TipoPergunta)) {
    throw new AppError(`${rotulo}: tipo de pergunta inválido.`, 400);
  }
  const tipo = i.tipo as TipoPergunta;

  const item: ItemFormulario = {
    ...(id ? { id } : {}),
    tipo,
    titulo: exigirTexto(i.titulo, `${rotulo}: título`, 1000),
    descricao: textoOpcional(i.descricao, `${rotulo}: descrição`, 4000),
    obrigatoria: i.obrigatoria === true,
  };

  if (tipo in TIPOS_ESCOLHA) {
    if (!Array.isArray(i.opcoes) || i.opcoes.length === 0) {
      throw new AppError(`${rotulo}: informe ao menos uma opção.`, 400);
    }
    if (i.opcoes.length > MAX_OPCOES) {
      throw new AppError(`${rotulo}: máximo de ${MAX_OPCOES} opções.`, 400);
    }
    const opcoes = i.opcoes.map((o, k) => exigirTexto(o, `${rotulo}: opção ${k + 1}`, 500));
    if (new Set(opcoes).size !== opcoes.length) {
      throw new AppError(`${rotulo}: há opções repetidas.`, 400);
    }
    item.opcoes = opcoes;
    item.permitirOutro = tipo !== 'lista_suspensa' && i.permitirOutro === true;
  }

  if (tipo === 'escala') {
    const e = (i.escala ?? {}) as Record<string, unknown>;
    const min = Number(e.min);
    const max = Number(e.max);
    if (![0, 1].includes(min) || !Number.isInteger(max) || max < 2 || max > 10) {
      throw new AppError(`${rotulo}: a escala deve começar em 0 ou 1 e terminar entre 2 e 10.`, 400);
    }
    item.escala = {
      min,
      max,
      rotuloMin: textoOpcional(e.rotuloMin, `${rotulo}: rótulo mínimo`, 100),
      rotuloMax: textoOpcional(e.rotuloMax, `${rotulo}: rótulo máximo`, 100),
    };
  }

  if (tipo === 'data') item.incluirHora = i.incluirHora === true;

  return item;
}

function validarEntrada(entrada: EntradaFormulario): EntradaValidada {
  const brutos: unknown = entrada?.itens ?? [];
  if (!Array.isArray(brutos)) throw new AppError('A lista de perguntas é inválida.', 400);
  if (brutos.length > MAX_ITENS) {
    throw new AppError(`O formulário pode ter no máximo ${MAX_ITENS} itens.`, 400);
  }

  const coleta = entrada?.coletaEmail;
  if (coleta !== undefined && !Object.hasOwn(COLETA_EMAIL, coleta)) {
    throw new AppError('Opção de coleta de e-mail inválida.', 400);
  }

  const itens = brutos.map(validarItem);
  const ids = itens.flatMap((i) => (i.id ? [i.id] : []));
  if (new Set(ids).size !== ids.length) throw new AppError('Há itens duplicados.', 400);

  return {
    titulo: exigirTexto(entrada?.titulo, 'Título', 300),
    descricao: textoOpcional(entrada?.descricao, 'Descrição', 4000),
    itens,
    coletaEmail: coleta ?? null,
  };
}

function validarId(id: unknown): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new AppError('Formulário inválido.', 400);
  return n;
}

// ── Conversão intranet <-> Google ────────────────────────────────────────────

function paraQuestion(item: ItemFormulario, questionId?: string | null): forms_v1.Schema$Question {
  const q: forms_v1.Schema$Question = { required: item.obrigatoria };
  if (questionId) q.questionId = questionId;

  switch (item.tipo) {
    case 'texto_curto':
    case 'paragrafo':
      q.textQuestion = { paragraph: item.tipo === 'paragrafo' };
      break;
    case 'multipla_escolha':
    case 'caixas_selecao':
    case 'lista_suspensa': {
      const options: forms_v1.Schema$Option[] = (item.opcoes ?? []).map((value) => ({ value }));
      if (item.permitirOutro) options.push({ isOther: true });
      q.choiceQuestion = { type: TIPOS_ESCOLHA[item.tipo], options };
      break;
    }
    case 'escala':
      q.scaleQuestion = {
        low: item.escala!.min,
        high: item.escala!.max,
        lowLabel: item.escala!.rotuloMin,
        highLabel: item.escala!.rotuloMax,
      };
      break;
    case 'data':
      q.dateQuestion = { includeTime: item.incluirHora === true, includeYear: true };
      break;
    case 'hora':
      q.timeQuestion = { duration: false };
      break;
  }
  return q;
}

function paraItemGoogle(item: ItemFormulario, existente?: forms_v1.Schema$Item): forms_v1.Schema$Item {
  const anterior = existente?.questionItem?.question;
  const question = paraQuestion(item, anterior?.questionId);
  // O updateItem substitui a pergunta inteira: preserva ajustes feitos no Google.
  if (anterior?.choiceQuestion && question.choiceQuestion) {
    question.choiceQuestion.shuffle = anterior.choiceQuestion.shuffle === true;
  }
  if (anterior?.dateQuestion && question.dateQuestion) {
    question.dateQuestion.includeYear = anterior.dateQuestion.includeYear === true;
  }
  return { title: item.titulo, description: item.descricao ?? '', questionItem: { question } };
}

function tipoDaQuestion(q: forms_v1.Schema$Question): TipoPergunta | null {
  if (q.textQuestion) return q.textQuestion.paragraph ? 'paragrafo' : 'texto_curto';
  if (q.choiceQuestion) {
    const opts = q.choiceQuestion.options ?? [];
    // Navegação entre seções e imagens nas opções não são editáveis aqui.
    if (opts.some((o) => o.goToAction || o.goToSectionId || o.image)) return null;
    const tipo = (Object.keys(TIPOS_ESCOLHA) as (keyof typeof TIPOS_ESCOLHA)[]).find(
      (k) => TIPOS_ESCOLHA[k] === q.choiceQuestion!.type,
    );
    return tipo ?? null;
  }
  if (q.scaleQuestion) return 'escala';
  if (q.dateQuestion) return 'data';
  if (q.timeQuestion && !q.timeQuestion.duration) return 'hora';
  return null;
}

type DadosQuestion = Omit<ItemFormulario, 'id' | 'titulo' | 'descricao'> & { tipo: TipoPergunta };

function lerQuestion(q: forms_v1.Schema$Question): DadosQuestion | null {
  const tipo = tipoDaQuestion(q);
  if (!tipo) return null;

  const item: DadosQuestion = { tipo, obrigatoria: q.required === true };
  if (q.choiceQuestion) {
    const opts = q.choiceQuestion.options ?? [];
    item.opcoes = opts.filter((o) => !o.isOther).map((o) => o.value ?? '');
    item.permitirOutro = opts.some((o) => o.isOther);
  }
  if (q.scaleQuestion) {
    item.escala = {
      min: q.scaleQuestion.low ?? 1,
      max: q.scaleQuestion.high ?? 5,
      rotuloMin: q.scaleQuestion.lowLabel || null,
      rotuloMax: q.scaleQuestion.highLabel || null,
    };
  }
  if (q.dateQuestion) item.incluirHora = q.dateQuestion.includeTime === true;
  return item;
}

function paraItemIntranet(g: forms_v1.Schema$Item): ItemFormulario {
  const base = {
    ...(g.itemId ? { id: g.itemId } : {}),
    titulo: g.title ?? '',
    descricao: g.description || null,
  };
  const q = g.questionItem?.question;
  // Perguntas de quiz (grading) ficam só leitura: salvar daqui apagaria o gabarito.
  const dados = q && !q.grading && !g.questionItem?.image ? lerQuestion(q) : null;
  return dados ? { ...base, ...dados } : { ...base, tipo: 'nao_suportado', obrigatoria: false };
}

function lerColetaEmail(g: forms_v1.Schema$Form): ColetaEmail {
  const tipo = g.settings?.emailCollectionType;
  if (tipo === 'VERIFIED') return 'verificado';
  if (tipo === 'RESPONDER_INPUT') return 'informado';
  return 'nao_coletar';
}

function requestColetaEmail(coleta: ColetaEmail): forms_v1.Schema$Request {
  return {
    updateSettings: {
      settings: { emailCollectionType: COLETA_EMAIL[coleta] },
      updateMask: 'emailCollectionType',
    },
  };
}

function paraResumo(r: RegistroComCriador): FormularioResumo {
  return {
    id: r.id,
    googleFormId: r.google_form_id,
    titulo: r.titulo,
    responderUri: r.responder_uri,
    criadoPor: { id: r.criado_por, nome: r.criado_por_nome },
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
  };
}

function paraDetalhe(r: RegistroComCriador, g: forms_v1.Schema$Form): Formulario {
  const estado = g.publishSettings?.publishState;
  return {
    ...paraResumo(r),
    titulo: g.info?.title ?? r.titulo,
    descricao: g.info?.description || null,
    responderUri: g.responderUri ?? r.responder_uri,
    editUri: `https://docs.google.com/forms/d/${r.google_form_id}/edit`,
    publicado: estado?.isPublished === true,
    aceitandoRespostas: estado?.isAcceptingResponses === true,
    coletaEmail: lerColetaEmail(g),
    revisao: g.revisionId ?? '',
    itens: (g.items ?? []).map(paraItemIntranet),
  };
}

/** Preserva itemId/questionId dos itens mantidos para não desvincular respostas antigas. */
function montarRequests(atuais: forms_v1.Schema$Item[], alvo: ItemFormulario[]): forms_v1.Schema$Request[] {
  const porId = new Map(atuais.map((g) => [g.itemId ?? '', g]));
  for (const item of alvo) {
    if (item.id && !porId.has(item.id)) {
      throw new AppError('O formulário foi alterado por outra pessoa. Recarregue e tente novamente.', 409);
    }
  }

  const requests: forms_v1.Schema$Request[] = [];
  const idsAlvo = new Set(alvo.map((i) => i.id));
  const posicoes = atuais.map((g) => g.itemId ?? '');

  for (let idx = posicoes.length - 1; idx >= 0; idx--) {
    if (!idsAlvo.has(posicoes[idx])) {
      requests.push({ deleteItem: { location: { index: idx } } });
      posicoes.splice(idx, 1);
    }
  }

  alvo.forEach((item, index) => {
    if (!item.id) {
      requests.push({ createItem: { item: paraItemGoogle(item), location: { index } } });
      posicoes.splice(index, 0, '');
      return;
    }

    const atual = posicoes.indexOf(item.id);
    if (atual !== index) {
      requests.push({ moveItem: { originalLocation: { index: atual }, newLocation: { index } } });
      posicoes.splice(atual, 1);
      posicoes.splice(index, 0, item.id);
    }

    const existente = porId.get(item.id)!;
    if (item.tipo !== 'nao_suportado' && paraItemIntranet(existente).tipo !== 'nao_suportado') {
      requests.push({
        updateItem: {
          item: paraItemGoogle(item, existente),
          location: { index },
          updateMask: 'title,description,questionItem',
        },
      });
    }
  });

  return requests;
}

// ── Persistência local + Google ──────────────────────────────────────────────

async function clientesGoogle(usuarioId: number) {
  const auth = await criarClienteAutenticado(usuarioId);
  return {
    forms: google.forms({ version: 'v1', auth }),
    drive: google.drive({ version: 'v3', auth }),
  };
}

async function buscarRegistro(id: unknown): Promise<RegistroComCriador> {
  const { rows } = await pool.query<RegistroComCriador>(
    `SELECT f.*, u.nome AS criado_por_nome
       FROM formularios f
       JOIN usuarios u ON u.id = f.criado_por
      WHERE f.id = $1`,
    [validarId(id)],
  );
  if (!rows[0]) throw new AppError('Formulário não encontrado.', 404);
  return rows[0];
}

async function lerForm(forms: forms_v1.Forms, formId: string): Promise<forms_v1.Schema$Form> {
  try {
    const { data } = await forms.forms.get({ formId });
    return data;
  } catch (err) {
    lancarErroGoogle(err, 'formularios');
  }
}

export async function listarFormularios(): Promise<FormularioResumo[]> {
  const { rows } = await pool.query<RegistroComCriador>(
    `SELECT f.*, u.nome AS criado_por_nome
       FROM formularios f
       JOIN usuarios u ON u.id = f.criado_por
      ORDER BY f.criado_em DESC`,
  );
  return rows.map(paraResumo);
}

export async function obterFormulario(id: unknown): Promise<Formulario> {
  const registro = await buscarRegistro(id);
  const { forms } = await clientesGoogle(registro.criado_por);
  const form = await lerForm(forms, registro.google_form_id);

  // Mantém a listagem coerente quando o título é alterado direto no Google.
  const titulo = form.info?.title;
  if (titulo && titulo !== registro.titulo) {
    await pool.query(`UPDATE formularios SET titulo = $1, atualizado_em = now() WHERE id = $2`, [
      titulo.slice(0, 300),
      registro.id,
    ]);
    registro.titulo = titulo;
  }
  return paraDetalhe(registro, form);
}

export async function criarFormulario(usuarioId: number, entrada: EntradaFormulario): Promise<Formulario> {
  const dados = validarEntrada(entrada);
  if (dados.itens.some((i) => i.id)) {
    throw new AppError('Um formulário novo não pode conter itens existentes.', 400);
  }
  if (!(await statusConexao(usuarioId))) {
    throw new AppError('Conecte sua conta ao Google Forms antes de criar formulários.', 403);
  }

  const { forms, drive } = await clientesGoogle(usuarioId);

  let formId: string;
  try {
    const { data } = await forms.forms.create({
      requestBody: { info: { title: dados.titulo, documentTitle: dados.titulo } },
    });
    formId = data.formId!;
  } catch (err) {
    lancarErroGoogle(err, 'formularios');
  }

  // O create só aceita o título; o resto vai em seguida. Se falhar, o form vai para a lixeira.
  let form: forms_v1.Schema$Form;
  try {
    const requests: forms_v1.Schema$Request[] = dados.itens.map((item, index) => ({
      createItem: { item: paraItemGoogle(item), location: { index } },
    }));
    if (dados.coletaEmail) requests.push(requestColetaEmail(dados.coletaEmail));
    if (dados.descricao) {
      requests.unshift({
        updateFormInfo: { info: { description: dados.descricao }, updateMask: 'description' },
      });
    }
    if (requests.length > 0) {
      await forms.forms.batchUpdate({ formId, requestBody: { requests } });
    }
    await forms.forms.setPublishSettings({
      formId,
      requestBody: {
        publishSettings: { publishState: { isPublished: true, isAcceptingResponses: true } },
        updateMask: 'publishState',
      },
    });
    ({ data: form } = await forms.forms.get({ formId }));
  } catch (err) {
    await drive.files.update({ fileId: formId, requestBody: { trashed: true } }).catch(() => undefined);
    lancarErroGoogle(err, 'formularios');
  }

  let novoId: number;
  try {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO formularios (google_form_id, titulo, responder_uri, criado_por)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [formId, dados.titulo, form.responderUri ?? '', usuarioId],
    );
    novoId = rows[0]!.id;
  } catch (err) {
    await drive.files.update({ fileId: formId, requestBody: { trashed: true } }).catch(() => undefined);
    throw err;
  }
  return paraDetalhe(await buscarRegistro(novoId), form);
}

export async function atualizarFormulario(id: unknown, entrada: EntradaFormulario): Promise<Formulario> {
  const dados = validarEntrada(entrada);
  const registro = await buscarRegistro(id);
  const { forms, drive } = await clientesGoogle(registro.criado_por);
  const atual = await lerForm(forms, registro.google_form_id);

  if (entrada.revisao && entrada.revisao !== atual.revisionId) {
    throw new AppError('O formulário foi alterado por outra pessoa. Recarregue e tente novamente.', 409);
  }

  const requests: forms_v1.Schema$Request[] = [
    {
      updateFormInfo: {
        info: { title: dados.titulo, description: dados.descricao ?? '' },
        updateMask: 'title,description',
      },
    },
    ...montarRequests(atual.items ?? [], dados.itens),
  ];
  if (dados.coletaEmail && dados.coletaEmail !== lerColetaEmail(atual)) {
    requests.push(requestColetaEmail(dados.coletaEmail));
  }

  let form: forms_v1.Schema$Form;
  try {
    await forms.forms.batchUpdate({
      formId: registro.google_form_id,
      requestBody: { requests, writeControl: { requiredRevisionId: atual.revisionId ?? null } },
    });
    if (dados.titulo !== atual.info?.documentTitle) {
      await drive.files.update({ fileId: registro.google_form_id, requestBody: { name: dados.titulo } });
    }
    ({ data: form } = await forms.forms.get({ formId: registro.google_form_id }));
  } catch (err) {
    lancarErroGoogle(err, 'formularios');
  }

  await pool.query(`UPDATE formularios SET titulo = $1, atualizado_em = now() WHERE id = $2`, [
    dados.titulo,
    registro.id,
  ]);
  registro.titulo = dados.titulo;
  return paraDetalhe(registro, form);
}

export async function alterarRecebimento(id: unknown, aceitando: unknown): Promise<boolean> {
  if (typeof aceitando !== 'boolean') {
    throw new AppError('Informe se o formulário deve aceitar respostas.', 400);
  }
  const registro = await buscarRegistro(id);
  const { forms } = await clientesGoogle(registro.criado_por);
  try {
    await forms.forms.setPublishSettings({
      formId: registro.google_form_id,
      requestBody: {
        publishSettings: { publishState: { isPublished: true, isAcceptingResponses: aceitando } },
        updateMask: 'publishState',
      },
    });
  } catch (err) {
    lancarErroGoogle(err, 'formularios');
  }
  return aceitando;
}

/** Move o form para a lixeira do Drive de quem criou e remove a referência local. */
export async function excluirFormulario(id: unknown): Promise<void> {
  const registro = await buscarRegistro(id);
  const { drive } = await clientesGoogle(registro.criado_por);
  try {
    await drive.files.update({ fileId: registro.google_form_id, requestBody: { trashed: true } });
  } catch (err) {
    const e = err as { code?: number; response?: { status?: number } };
    if ((e.code ?? e.response?.status) !== 404) lancarErroGoogle(err, 'formularios');
  }
  await pool.query(`DELETE FROM formularios WHERE id = $1`, [registro.id]);
}

function colunasDoForm(form: forms_v1.Schema$Form): ColunaResposta[] {
  return (form.items ?? []).flatMap((g): ColunaResposta[] => {
    const q = g.questionItem?.question;
    if (q?.questionId) {
      const dados = lerQuestion(q);
      return [{
        questionId: q.questionId,
        titulo: g.title ?? '',
        tipo: dados?.tipo ?? 'nao_suportado',
        ...(dados?.opcoes ? { opcoes: dados.opcoes } : {}),
        ...(dados?.escala ? { escala: dados.escala } : {}),
      }];
    }
    // Grades: uma coluna por linha.
    return (g.questionGroupItem?.questions ?? []).flatMap((gq) =>
      gq.questionId
        ? [{ questionId: gq.questionId, titulo: `${g.title ?? ''} [${gq.rowQuestion?.title ?? ''}]`, tipo: 'nao_suportado' as const }]
        : [],
    );
  });
}

export async function listarRespostas(id: unknown): Promise<RespostasFormulario> {
  const registro = await buscarRegistro(id);
  const { forms } = await clientesGoogle(registro.criado_por);
  const form = await lerForm(forms, registro.google_form_id);

  const brutas: forms_v1.Schema$FormResponse[] = [];
  try {
    let pageToken: string | undefined;
    do {
      const { data } = await forms.forms.responses.list({
        formId: registro.google_form_id,
        pageSize: 5000,
        ...(pageToken ? { pageToken } : {}),
      });
      brutas.push(...(data.responses ?? []));
      pageToken = data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (err) {
    lancarErroGoogle(err, 'formularios');
  }

  const respostas: RespostaFormulario[] = brutas
    .map((r) => ({
      id: r.responseId ?? '',
      enviadaEm: r.lastSubmittedTime ?? r.createTime ?? null,
      email: r.respondentEmail ?? null,
      valores: Object.fromEntries(
        Object.entries(r.answers ?? {}).map(([qid, a]) => [
          qid,
          (a.textAnswers?.answers ?? []).map((t) => t.value ?? ''),
        ]),
      ),
    }))
    .sort((a, b) => (b.enviadaEm ?? '').localeCompare(a.enviadaEm ?? ''));

  return { titulo: form.info?.title ?? registro.titulo, perguntas: colunasDoForm(form), respostas };
}
