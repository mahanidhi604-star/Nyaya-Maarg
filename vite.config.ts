import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function assistantApiPlugin(): Plugin {
  return {
    name: 'assistant-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/assistant', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { handleAssistantRequest } = await server.ssrLoadModule('/src/server/assistantHandler.ts');
            const clientIp = req.socket.remoteAddress || '127.0.0.1';
            const result = await handleAssistantRequest(parsed, clientIp);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal assistant proxy error' }));
          }
        });
      });

      server.middlewares.use('/api/interpret', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { handleInterpretRequest } = await server.ssrLoadModule('/src/server/interpreterHandler.ts');
            const clientIp = req.socket.remoteAddress || '127.0.0.1';
            const result = await handleInterpretRequest(parsed, clientIp);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal interpreter proxy error' }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    assistantApiPlugin(),
  ],
});
