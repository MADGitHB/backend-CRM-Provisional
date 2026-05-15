import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import leadsRoutes from './routes/leads.js';
import usersRoutes from './routes/users.js';
import territoriosRoutes from './routes/territorios.js';
import statsRoutes from './routes/stats.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:9080'],
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/territorios', territoriosRoutes);
app.use('/api/stats', statsRoutes);

app.listen(PORT, () => console.log(`CRM API corriendo en http://localhost:${PORT}`));
