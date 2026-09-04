import { getCanvasGraphByWorkspaceId,SaveCanvasGraph } from "../controllers/canvasGraph.controller.js";

import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import { validate } from "../middlewares/validate.middleware.js"
import { workspaceIdParamSchema, saveCanvasGraphSchema } from "../validators/canvas.validator.js";

const router = Router()

router.use(verifyJwt)

router.route("/:workspaceId").get(
    validate(workspaceIdParamSchema, "params"),
    getCanvasGraphByWorkspaceId
).post(
    validate(workspaceIdParamSchema, "params"),
    validate(saveCanvasGraphSchema, "body"),
    SaveCanvasGraph
);

export default router;
