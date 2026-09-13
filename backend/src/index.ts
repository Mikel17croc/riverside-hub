import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { profilesRouter } from './routes/profiles';
import { resourcesRouter } from './routes/resources';
import { bookingsRouter } from './routes/bookings';
import { campaignsRouter } from './routes/campaigns';
import { donationsRouter } from './routes/donations';
import { notificationsRouter } from './routes/notifications';
import { adminRouter } from './routes/admin';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/profiles', profilesRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Riverside Hub API listening on http://localhost:${PORT}`);
});
