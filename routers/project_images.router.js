import { CreateImageCollectionOfProject,RemoveImageCollectionOfProject } from "../controllers/project_images.controller.js";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router()

router.route("/projects/:projectId/images").post(verifyJwt,
    upload.array('images', 5),
    CreateImageCollectionOfProject)

router.route("/projects/:projectId/Deleteimage/:imageId").delete(verifyJwt,RemoveImageCollectionOfProject)


    
export default router