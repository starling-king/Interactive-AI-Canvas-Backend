import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import { CreateResume,ReadResume } from "../controllers/resume.controller.js"

const router = Router()

//private
router.route("/Make").post(verifyJwt,CreateResume)

//public
router.route("/PublicRead/:user").get(ReadResume)

export default router