import { Router } from "express";
import { loginUser, logoutUser, registerUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAdminDetails} from "../controllers/admin_user.controller.js";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
// import { upload } from "../middlewares/multer.middlewares.js"

const router = Router()

router.route("/register").post(
    registerUser
)

router.route("/login").post(loginUser)
router.route("/refreshAccessToken").post(refreshAccessToken)

//secure section
router.route("/logout").post(verifyJwt,logoutUser)
router.route("/changePassword").post(verifyJwt,changeCurrentPassword)
router.route("/getCurrentUser").get(verifyJwt,getCurrentUser)
router.route("/updateAdminDetails").post(verifyJwt,updateAdminDetails)
export default router


