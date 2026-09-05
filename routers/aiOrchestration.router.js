import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
    submitAiPrompt,
    pollAiJobStatus
} from "../controllers/aiOrchestration.controller.js";
import {
    orchestrationWorkspaceParamSchema,
    pollJobParamSchema,
    submitAiPromptSchema
} from "../validators/prompt.validator.js";

const router = Router();

router.use(verifyJwt);


router.route("/submit/:workspaceId").post(
    validate(orchestrationWorkspaceParamSchema, "params"), 
    validate(submitAiPromptSchema, "body"),                
    submitAiPrompt                                         
);


router.route("/poll/:orchestrationId").get(
    validate(pollJobParamSchema, "params"),               
    pollAiJobStatus                                        
);

export default router;