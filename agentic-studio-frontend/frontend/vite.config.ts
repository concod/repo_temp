import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

async function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'banner-agent-ai-proxy',
        configureServer(server) {
          server.middlewares.use('/api/ai/generate-content', async (req, res, next) => {
            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              res.end();
              return;
            }
            if (req.method !== 'POST') return next();

            try {
              const apiKey = env.GEMINI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing GEMINI_API_KEY' }));
                return;
              }

              const body = await readJsonBody(req);
              const { contents, config, model: requestedModel, editor } = body;

              if (!contents) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing required field: contents' }));
                return;
              }

              const defaultModel = editor === 'image-editor'
                ? 'gemini-2.5-flash-image'
                : 'gemini-3-pro-image';
              const model = requestedModel || defaultModel;

              const { GoogleGenAI } = await import('@google/genai');
              const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1alpha' });

              const response = await ai.models.generateContent({
                model,
                contents,
                config: config || {},
              });

              const responseData = {
                candidates: response.candidates?.map((candidate: any) => ({
                  content: {
                    parts: candidate.content?.parts?.map((part: any) => {
                      if (part.inlineData) {
                        return { inlineData: part.inlineData };
                      }
                      if (part.text) {
                        return { text: part.text };
                      }
                      return part;
                    }) || [],
                  },
                  finishReason: candidate.finishReason,
                })) || [],
                promptFeedback: response.promptFeedback,
                text: response.text,
              };

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(responseData));
            } catch (error: any) {
              const message = error?.message || 'Failed to generate AI content';
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: message }));
            }
          });

          server.middlewares.use('/api/ai/resize-image', async (req, res, next) => {
            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              res.end();
              return;
            }
            if (req.method !== 'POST') return next();

            try {
              const apiKey = env.GEMINI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing GEMINI_API_KEY' }));
                return;
              }

              const body = await readJsonBody(req);
              const { base64Image, mimeType, prompt, targetWidth, targetHeight } = body;

              if (!base64Image || !mimeType || !prompt) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing required fields: base64Image, mimeType, prompt' }));
                return;
              }

              const model = 'gemini-3-pro-image';
              const { GoogleGenAI, Modality } = await import('@google/genai');
              const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1alpha' });

              const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
              const imageSizes = ['4K', '2K'];
              let lastError: any = null;

              for (let attempt = 0; attempt < imageSizes.length; attempt += 1) {
                const size = imageSizes[attempt];
                try {
                  const response = await ai.models.generateContent({
                    model,
                    contents: {
                      parts: [
                        {
                          inlineData: {
                            data: base64Image,
                            mimeType,
                          },
                        },
                        { text: prompt },
                      ],
                    },
                    config: {
                      responseModalities: [Modality.IMAGE],
                      imageConfig: {
                        imageSize: size as any,
                      },
                    },
                  });

                  const firstPart = response.candidates?.[0]?.content?.parts?.[0];
                  if (firstPart?.inlineData?.data) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                      success: true,
                      data: firstPart.inlineData.data,
                      mimeType: firstPart.inlineData.mimeType || mimeType,
                      targetWidth,
                      targetHeight,
                    }));
                    return;
                  }

                  const textResponse = response.text?.trim();
                  if (textResponse) {
                    throw new Error(`API returned text instead of an image: "${textResponse}"`);
                  }
                  throw new Error('No image data found in the API response');
                } catch (error: any) {
                  lastError = error;
                  const status = error?.error?.status || error?.status;
                  const code = error?.error?.code || error?.code;
                  const message: string = error?.message || '';
                  const retryable = status === 'UNAVAILABLE' || status === 503 || code === 503 || /Deadline expired/i.test(message);

                  if (attempt < imageSizes.length - 1 && retryable) {
                    await sleep(1200 * (attempt + 1));
                    continue;
                  }
                  break;
                }
              }

              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: lastError?.message || 'AI resize image API call failed' }));
            } catch (error: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'AI resize image API call failed' }));
            }
          });
        },
      },
    ],
    server: {
      port: 8000,
      host: true,
      open: false,
    },
    preview: {
      port: 8000,
      host: true,
    },
  };
})
