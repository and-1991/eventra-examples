const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors()); //
app.use(express.text());
app.use(express.json());
app.use((req, res, next) => {
 if (typeof req.body === "string") {
  try {
   req.body = JSON.parse(req.body);
  } catch {}
 }
 next();
});

app.get("/", (req, res) => {
 res.send("OK");
});

app.post("/track", (req, res) => {
 console.log("TRACK HIT");
 console.log("EVENT:", JSON.stringify(req.body, null, 2));
 res.sendStatus(200);
});



app.post("/cli/events", (req, res) => {
 console.log("CLI EVENTS HIT");

 console.log(
   JSON.stringify(req.body, null, 2)
 );

 res.json({
  ok: true
 });
});

app.listen(4000, () => {
 console.log("Mock server running on http://localhost:4000");
});
