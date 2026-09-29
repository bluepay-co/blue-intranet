// Gostos do Bluelover, pode definir os emojis e textos padrões na hora do cadastro.
// 5º item (opcional): campo da imagem que substitui o emoji no card — hoje só o personagem.

export const GOSTOS = [
  ['gosto_comida', '🍕', 'Comida favorita', 'Ex.: Pizza'],
  ['gosto_assiste', '🎬', 'O que assiste', 'Ex.: Breaking Bad'],
  ['gosto_musica', '🎵', 'Música favorita', 'Ex.: Rock'],
  ['gosto_cor', '🎨', 'Cor favorita', 'Ex.: Azul'],
  ['gosto_rede_social', '📱', 'Rede social', 'Ex.: Instagram'],
  ['gosto_emoji', '✨', 'Meu emoji', 'Ex.: 🚀'],
  ['hobby', '🎯', 'Hobby favorito', 'Ex.: Correr aos domingos'],
  ['presente_perfeito', '🎁', 'Presente perfeito', 'Ex.: Um fone de ouvido novo'],
  ['personagem', '🎭', 'Personagem com quem me identifico', 'Ex.: Homem-Aranha', 'personagem_foto_url'],
]

/** Pergunta completa exibida no cadastro do card de personagem. */
export const PERGUNTA_PERSONAGEM = 'Qual personagem de filme, série ou desenho você se identifica?'

/** Limite por campo; o restante segue o padrão de 120 caracteres. */
export const LIMITES_GOSTO = { gosto_emoji: 8, presente_perfeito: 200 }
