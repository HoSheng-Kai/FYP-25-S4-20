import express from 'express';

import userRouter from './router/userRouter';
import productRouter from './router/productRouter';

const app = express();
app.use(express.json());

app.use('/api/users', userRouter);
app.use('/api/products', productRouter);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
