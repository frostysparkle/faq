import { Router } from "express";
import { adminRouter } from "./admin.routes.js";
import { answerRouter, questionRouter } from "./qna.routes.js";
import { authRouter } from "./auth.routes.js";
import { categoryRouter, tagRouter } from "./taxonomy.routes.js";
import { chatRouter } from "./chat.routes.js";
import { faqRouter } from "./faq.routes.js";
import { flagRouter } from "./flag.routes.js";
import { moderationRouter } from "./moderation.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/faqs", faqRouter);
apiRouter.use("/categories", categoryRouter);
apiRouter.use("/tags", tagRouter);
apiRouter.use("/questions", questionRouter);
apiRouter.use("/answers", answerRouter);
apiRouter.use("/flags", flagRouter);
apiRouter.use("/moderation", moderationRouter);
apiRouter.use("/chat", chatRouter);
apiRouter.use("/admin", adminRouter);
