// require('dotenv').config({path:"./env"})
//new nodejs feature come we add the --env-file=.env wiile running help built in .env support in node
import connectDB from "../data/connect.js";
import {app} from "./app.js"

connectDB()
.then(()=> {

        app.on("error",(error)=>{
            console.log("ERRR: ",error);
            throw error
        })

    app.listen(process.env.PORT || 8000,() =>{
        console.log(`Server is running at port: ${process.env.PORT}`);
    })
})
//connect.js return promise which is not resolved because async function return promises
.catch((err)=>{
    console.log("Mongo Db connection failed !!", err);
})