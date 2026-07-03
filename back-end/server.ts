import http from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { setIo } from './socket/io-instance';
import { registrarChatSocket } from './socket/chat.socket';

const PORT = process.env.PORT || 3000;

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Servidor está iniciando na porta ${PORT}`);
});
