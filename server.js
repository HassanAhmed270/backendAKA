const express = require('express');
const connectDB = require('./database/db');
const userRoutes = require('./routes/userRoutes.js');
const productRoutes = require('./routes/productRoutes.js');
const cartRoutes = require('./routes/cartRoutes.js');
const orderRoutes=require('./routes/orderRoutes.js');
const cors = require('cors')
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const FRONTEND_URL=process.env.FRONTEND_URL||process.env.PREVIEW_URL || "http://localhost:5173"

app.use(cors({
  origin: FRONTEND_URL, credentials:true
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();
// ROUTES
const jazzcashRoutes = require("./routes/jazzcashRoutes");
app.use("/api/jazzcash", jazzcashRoutes);

app.use('/api/v1/user', userRoutes);
app.use('/api/v1/product', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});