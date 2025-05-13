const express = require('express');
require('dotenv').config();
const cors = require('cors');
const app = express();
const pool = require("./utils/db");

//middleware
app.use(express.json());
app.use(cors({ origin: '*' }));


//routes
app.use("/", require("./routes"));

app.listen(process.env.PORT, () => {
    console.log(`server started on port ${process.env.PORT}`);
})
