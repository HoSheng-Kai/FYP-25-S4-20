require('dotenv').config();
const express = require("express");
const app = express();

app.use(express.json());

const testRouter = require("./app/boundary/test.router");

app.use("/test", testRouter);

app.listen(3000, () => {  
  console.log("Server running on port 3000");
});