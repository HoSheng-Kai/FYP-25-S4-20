import express from 'express';

import userRouter from './router/userRouter';
import distributorRouter from './router/distributorRouter';
import productRouter from './router/productRouter';
import notificationRouter from './router/notificationRouter';

const app = express();
app.use(express.json());

app.use('/api/users', userRouter);
app.use('/api/products', productRouter);
app.use('/api/notifications', notificationRouter);

// Testing blockchain here
app.use('/api/distributor', distributorRouter);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});