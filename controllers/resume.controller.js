import { ApiError } from "../error/ApiErrors.error.js";
import { ApiResponse } from "../error/ApiResponse.error.js";
import { asyncHandler } from "../error/asyncHandlers.error.js";
import { Admin } from "../models/admin_users.model.js";
import { SiteContent } from "../models/site_content.model.js";
import { ResumeAi } from "../models/ResumeAi.model.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Project } from "../models/Project.model.js";

const CreateResume = asyncHandler(async (req, res) => {
    //take input in body and verify
    //get admin details and verify
    //get layout and custom sections and verify
    //get projects and verify
    //do the ai process
    //store in the database

    try {

        const { title, targetKeywords, customLinks, resumeId } = req.body;
        const user = req.user?._id;
        const validKeywords = Array.isArray(targetKeywords) ? targetKeywords : [];
        const validLinks = (typeof customLinks === 'object' && customLinks !== null && !Array.isArray(customLinks))
            ? customLinks
            : {};

        if (!title || String(title).trim() === "") {
            throw new ApiError(400, "All fields are required");
        }


        const adminDetails = await Admin.findById(user).select(
            "-passwordHash -refreshToken")

        if (!adminDetails) {
            throw new ApiError(400, 'user not found')
        }

        const layoutinfo = await SiteContent.findOne(
            {
                sectionKey: 'page_layout',
                updatedByAdminId: user
            }, { contentValue: 1, _id: 0 }
        ).lean();

        let customSectionKeys = ["hero", "skills", "projects"];
        if (layoutinfo && layoutinfo.contentValue) {
            try {
                customSectionKeys = JSON.parse(layoutinfo.contentValue);
            } catch (e) {
                console.error("Layout parse error");
            }
        }

        const layoutInformation = await SiteContent.find({
            updatedByAdminId: user,
            sectionKey: { $in: customSectionKeys }
        }).lean();

        const orderedLayoutData = customSectionKeys.map(key => {
            return layoutInformation.find(doc => doc.sectionKey === key);
        }).filter(Boolean);

        const projectInformation = await Project.find({
            createdByAdminId: user,
            isPublished: true
        }).lean();

        if (!projectInformation.length && !layoutInformation.length) {
            throw new ApiError(400, "please provides the project informations")
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const model = genAI.getGenerativeModel({
            model: "gemini-3.6-flash",
            generationConfig: {
                responseMimeType: "application/json", // Forces pure JSON output
            }
        });


        const prompt = `
            You are an elite, ATS-optimized technical resume writer strictly following Savinder Puri's Resume Laws.
            
            YOUR WRITING LAWS:
            1. Keep it Concise (Rule 4): Project bullet points MUST be limited to one or two lines max. 
            2. Convert Activities into Outcomes (Rule 9): Use strong action verbs. Detail specific contributions, what was designed, automated, or solved.
            3. Quantify Achievements: You must extract and emphasize specific metrics (e.g., percentages, scale, or time saved).
            4. ATS Skills Retention: Include ALL hard technical skills (programming languages, frameworks, databases, tools) found in the RAW DATABASE DATA. Do NOT omit existing hard technical skills. 
            5. HTML Keyword Formatting: You MUST wrap any mention of the TARGET KEYWORDS (or close variations) in HTML <strong> tags. For example: <strong>React.js</strong>. Do this in both the skills arrays and project bullet points.
            6. STRICT SEQUENCING: I am providing 'Ordered Site Content'. You MUST output the 'additionalSections' in the EXACT top-to-bottom sequence provided in this array. Do not rearrange them.
            7. HEADER LINKS: For the header 'links' object, ONLY use the exact URLs explicitly provided in the 'CUSTOM LINKS TO INCLUDE'. NEVER extract a project's repository link from the database to use as the header profile link. If a custom link is missing, leave the string empty.
            
            TARGET KEYWORDS: ${JSON.stringify(validKeywords)}
            CUSTOM LINKS TO INCLUDE: ${JSON.stringify(validLinks)}

            RAW DATABASE DATA:
            Projects: ${JSON.stringify(projectInformation)}
            Ordered Site Content (Respect this sequence!): ${JSON.stringify(orderedLayoutData)}
            Admin Name/Email: ${adminDetails.username} / ${adminDetails.email}

            CRITICAL DATA INTEGRITY RULE:
            Do NOT invent, assume, or hallucinate ANY information (like Education). If a detail is not explicitly present in the RAW DATABASE DATA, do not create it.

            RETURN EXACTLY THIS JSON STRUCTURE:
            {
                "header": { "name": "...", "email": "...", "links": {"linkedin": "...", "github": "...", "portfolio": "..."} },
                "skills": { "languages": [...], "frameworks": [...], "tools": [...] },
                "projects": [
                    { "title": "...", "techStack": "...", "bulletPoints": ["...", "..."] }
                ],
                "additionalSections": [
                    { "title": "...", "content": ["...", "..."] }
                ]
            }
        `;

        const result = await model.generateContent(prompt);

        const generatedJSONString = result.response.text();

        const searchQuery = resumeId
            ? { _id: resumeId, userid: user }
            : { title: title, userid: user };

        const newResume = await ResumeAi.findOneAndUpdate(
            searchQuery,
            {
                title: title,
                targetKeywords: validKeywords,
                customLinks: validLinks,
                generatedContent: generatedJSONString,
                userid: user
            },
            {
                upsert: true,
                new: true
            }
        );


        return res.status(201).json(
            new ApiResponse(201, newResume, "AI Resume successfully generated")
        );

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res
            .status(statusCode)
            .json(
                new ApiResponse(
                    statusCode,
                    null,
                    error.message || "Internal Server Error",
                ),
            );
    }
});

const ReadResume = asyncHandler(async (req, res) => {
    try {
        const username = req.params.user
        const exist = await Admin.findOne({ username })

        if (!exist) {
            throw new ApiError(400, "user does not exist")
        }

        const userid = exist._id


        const content = await ResumeAi.findOne({ userid: userid }).sort({ updatedAt: -1 });

        return res.status(200).json(new ApiResponse(200, content, "successful"))

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, null, error.message || "Internal Server Error")
        );
    }

});

export { CreateResume, ReadResume };

