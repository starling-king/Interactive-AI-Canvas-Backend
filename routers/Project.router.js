import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import {
    createWorkspace,
    getAllAdminWorkspaces,
    updateWorkspace,
    deleteWorkspace } from "../controllers/workspace.controller.js";

const router = Router()

router.route("/createWorkspace").post(verifyJwt,createWorkspace)
router.route("/getAllAdminWorkspaces").get(verifyJwt,getAllAdminWorkspaces)
router.route("/updateWorkspace/:id").patch(verifyJwt,updateWorkspace)
router.route("/deleteWorkspace/:id").delete(verifyJwt,deleteWorkspace)

export default router
