import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import globalError from "../error/global.error.js";

//routers import
import createAdminRouter from "../routers/admin_user.router.js"
import createSiteContent from "../routers/site_content.router.js"
import sendMessage from "../routers/contact_messages.router.js"
import projectRouter from "../routers/Project.router.js"
import imageRouter from "../routers/project_images.router.js"
import resume from "../routers/ResumeAi.router.js"


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
app.use("/api/v1/admin", createAdminRouter)
app.use("/api/v1/content", createSiteContent)
app.use("/api/v1/Message", sendMessage)
app.use("/api/v1/Projects", projectRouter)
app.use("/api/v1/images", imageRouter)
app.use("/api/v1/Resume", resume)

//setup global error

app.use(globalError);


export { app }
