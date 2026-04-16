const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
 res.send("OK");
});

app.post("/track", (req, res) => {
 console.log("EVENT:", JSON.stringify(req.body, null, 2));
 res.sendStatus(200);
});

app.listen(4000, () => {
 console.log("Mock server running on http://localhost:4000");
});
