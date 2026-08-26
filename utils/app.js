import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import globalError from "../error/global.error.js";

//routers import
import userRouter from "../routers/user.router.js";
// import workspaceRouter from "../routers/workspace.router.js";
// import canvasGraphRouter from "../routers/canvasGraph.router.js";
// import graphVersionRouter from "../routers/graphVersion.router.js";
// import aiOrchestrationRouter from "../routers/aiOrchestration.router.js";


const app = express()

app.set("trust proxy", 1);

const allowedOrigins = process.env.CORS_ORIGIN === "*"
  ? "*"
  : process.env.CORS_ORIGIN.split(',');

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))

app.use(cookieParser())

//router decleration
app.use("/api/v1/users", userRouter);
// app.use("/api/v1/workspaces", workspaceRouter);
// app.use("/api/v1/canvas", canvasGraphRouter);
// app.use("/api/v1/versions", graphVersionRouter);
// app.use("/api/v1/ai", aiOrchestrationRouter);

//setup global error

app.use(globalError);


export { app }
