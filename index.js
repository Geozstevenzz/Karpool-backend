const express = require('express');
const cors = require('cors');
const app = express();
const pool = require("./db");

//middleware
app.use(express.json());
app.use(cors());

//routes
app.use("/data", require("./routes/getData"));

app.listen(9000, () => {
    console.log("server started on port 9000");
})
