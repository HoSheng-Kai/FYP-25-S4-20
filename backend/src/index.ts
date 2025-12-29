import express from 'express';
import cors from 'cors';

import userRouter from './router/userRouter';
import distributorRouter from './router/distributorRouter';
import adminRouter from './router/adminRouter';
import validationRouter from './router/validationRouter';
import productRouter from './router/productRouter';
import notificationRouter from './router/notificationRouter';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // optional but useful

app.use('/api/users', userRouter);
app.use('/api/admins', adminRouter);
app.use('/api/products', productRouter);
app.use('/api/notifications', notificationRouter);

// Testing blockchain here
app.use('/api/distributors', distributorRouter);
app.use('/api/validate', validationRouter);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});