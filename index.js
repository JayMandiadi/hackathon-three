const express = require('express')
const app = express()
const port = 5000

// if (process.env.NODE_ENV !== 'production') {
require('dotenv').config();
// }

const indexRouter = require("./routes/index");


app.use("/", indexRouter);
app.use(express.json());
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
module.exports = app;
