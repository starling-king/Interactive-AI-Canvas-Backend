import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import {writeContent,read} from "../controllers/site_content.controller.js"

const router = Router()
//secure
router.route("/writeContent").post(verifyJwt,writeContent)

//public
router.route("/read/:user").get(read)


export default router

