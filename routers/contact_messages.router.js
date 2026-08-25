import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import {SavetheDataOfForm,DiscoverMessage} from "../controllers/contact_messages.controller.js"

const router = Router()

router.route("/saveMessage/:username").post(SavetheDataOfForm)
router.route("/DiscoverMessage").patch(verifyJwt,DiscoverMessage)




export default router