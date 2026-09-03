import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import { validate } from "../middlewares/validate.middleware.js"
import { createWorkspaceSchema, updateWorkspaceSchema, workspaceIdParamSchema } from "../validators/workspace.validator.js"
import { createWorkspace, getAllAdminWorkspaces, updateWorkspace, deleteWorkspace, getPublicWorkspaceById } from "../controllers/workspace.controller.js";

const router = Router()


router.route("/public/:slug").get(getPublicWorkspaceById)

router.use(verifyJwt);

router.route("/createWorkspace").post(validate(createWorkspaceSchema), createWorkspace)

router.route("/getAllAdminWorkspaces").get(getAllAdminWorkspaces)

router.route("/updateWorkspace/:id").patch(validate(workspaceIdParamSchema, "params"), validate(updateWorkspaceSchema, "body"), updateWorkspace)

router.route("/deleteWorkspace/:id").delete(validate(workspaceIdParamSchema, "params"),deleteWorkspace)

export default router
