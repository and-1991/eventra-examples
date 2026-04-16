const express=require("express");
const app=express();
app.use(express.json());
app.post("/track",(req,res)=>{
 console.log("EVENT:",req.body);
 res.sendStatus(200);
});
app.listen(4000,()=>console.log("mock server :4000"));
