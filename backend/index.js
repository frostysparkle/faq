'use strict';
const env = require('./src/config/env');
const connectDB = require('./src/config/db');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./src/routes/auth');
const faqRoutes = require('./src/routes/faqs');
const qnaRoutes = require('./src/routes/qna');
const chatRoutes = require('./src/routes/chat');
const adminRoutes = require('./src/routes/admin');
const flagRoutes = require('./src/routes/flags');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.VITE_ORIGIN, credentials: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', faqRoutes);
app.use('/api/qna', qnaRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', adminRoutes);
app.use('/api/flags', flagRoutes);

app.use(errorHandler);

(async () => {
  await connectDB();
  app.listen(env.PORT, () => console.log(`[server] Listening on port ${env.PORT}`));
})();
