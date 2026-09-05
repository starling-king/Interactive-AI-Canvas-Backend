import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import { validate } from "../middlewares/validate.middleware.js"
import {
    createVersionSnapshot, getWorkspaceVersionHistory, getSingleVersionPreview, restoreVersion } from "../controllers/graphVersion.controller.js";
    
import { workspaceIdVersionParamSchema, versionIdParamSchema, createVersionSchema } from "../validators/graph.validator.js";

const router = Router()

//protected router
router.use(verifyJwt)

router.route("/preview/:versionId").get(
    validate(versionIdParamSchema, "params"),
    getSingleVersionPreview
);

router.route("/restore/:versionId").post(
    validate(versionIdParamSchema, "params"),
    restoreVersion
);

//Workspace endpoints.
router.route("/workspace/:workspaceId")
    .get(
        validate(workspaceIdVersionParamSchema, "params"),
        getWorkspaceVersionHistory
    )
    .post(
        validate(workspaceIdVersionParamSchema, "params"),
        validate(createVersionSchema),
        createVersionSnapshot
    );



export default router
