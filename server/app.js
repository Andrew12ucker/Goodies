import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import webhookRoutes from './routes/webhooks.js';

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());
app.use(cors({ origin: ['https://yourdomain.com'], credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// Normal JSON parsing for regular routes
app.use(express.json({ limit: '1mb' }));

// Webhook route (must come *before* express.json() if sharing same path)
app.use('/webhook', webhookRoutes);
