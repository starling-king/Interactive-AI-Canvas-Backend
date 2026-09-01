import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import { createProject,getAllAdminProjects,getAdminProjectByID,updateProject,deleteProject,getPublicProjects,getProjectBySlug } from "../controllers/Project.controller.js";

const router = Router()

router.route("/createProject").post(verifyJwt,createProject)
router.route("/getAllAdminProjects").get(verifyJwt,getAllAdminProjects)
router.route("/getAdminProjectByID/:id").get(verifyJwt,getAdminProjectByID)
router.route("/updateProject/:id").patch(verifyJwt,updateProject)
router.route("/deleteProject/:id").delete(verifyJwt,deleteProject)

//public router
router.route("/getPublicProjects/:username").get(getPublicProjects)
router.route("/getProjectBySlug/:username/:slug").get(getProjectBySlug)

export default router
