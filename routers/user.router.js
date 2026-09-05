import { Router } from "express";
import { loginUser, logoutUser, registerUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAdminDetails} from "../controllers/user.controller.js";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import { validate } from "../middlewares/validate.middleware.js"
import {
    registerSchema,loginSchema,updateAdminSchema,changePasswordSchema} from "../validators/user.validator.js";

const router = Router()

router.route("/register").post(validate(registerSchema),registerUser)

router.route("/login").post(validate(loginSchema),loginUser)
router.route("/refreshAccessToken").post(refreshAccessToken)

//secure section
router.route("/logout").post(verifyJwt,logoutUser)
router.route("/changePassword").post(verifyJwt,validate(changePasswordSchema),changeCurrentPassword)
router.route("/getCurrentUser").get(verifyJwt,getCurrentUser)
router.route("/updateAdminDetails").post(verifyJwt, validate(updateAdminSchema), updateAdminDetails)


export default router


