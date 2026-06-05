/**
 * Erro de negócio com status HTTP semântico embutido.
 * Permite que os Services lancem falhas que o Controller traduz diretamente
 * para a resposta correta (401, 403, 409, ...) sem vazar lógica de HTTP.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}
