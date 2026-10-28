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
            // Validate Supabase JWT token or guest mode
            const { verifyUserToken } = await server.ssrLoadModule('/src/server/authMiddleware.ts');
            const authCheck = await verifyUserToken(req, true);
            if (!authCheck.isAuthenticated && !authCheck.isGuest) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: authCheck.error || 'Unauthorized: valid session token required' }));
              return;
            }

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
            // Validate Supabase JWT token or guest mode
            const { verifyUserToken } = await server.ssrLoadModule('/src/server/authMiddleware.ts');
            const authCheck = await verifyUserToken(req, true);
            if (!authCheck.isAuthenticated && !authCheck.isGuest) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: authCheck.error || 'Unauthorized: valid session token required' }));
              return;
            }

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
  server: {
    host: true,
    port: 5173,
  },
  plugins: [
    tailwindcss(),
    react(),
    assistantApiPlugin(),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/leaflet/')) {
            return 'leaflet-vendor';
          }
          if (id.includes('node_modules/recharts/')) {
            return 'recharts-vendor';
          }
          if (id.includes('node_modules/@phosphor-icons/')) {
            return 'icons';
          }
        },
      },
    },
  },
});
