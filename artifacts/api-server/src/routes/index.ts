import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import branchesRouter from "./branches";
import yearsRouter from "./years";
import semestersRouter from "./semesters";
import subjectsRouter from "./subjects";
import resourcesRouter from "./resources";
import submissionsRouter from "./submissions";
import reportsRouter from "./reports";
import curriculumTemplatesRouter from "./curriculum-templates";
import paymentsRouter from "./payments";
import settingsRouter from "./settings";
import analyticsRouter from "./analytics";
import semesterQpsRouter from "./semester-qps";
import iaPapersRouter from "./ia-papers";
import { readSession } from "../middlewares/auth";

const router: IRouter = Router();

// Attaches req.admin (if a valid session cookie is present) before any route
// runs, so both public routes (to vary behavior for admins) and protected
// routes (to enforce requireAdmin) can rely on it.
router.use(readSession);

router.use(healthRouter);
router.use(authRouter);
router.use(branchesRouter);
router.use(yearsRouter);
router.use(semestersRouter);
router.use(subjectsRouter);
router.use(resourcesRouter);
router.use(submissionsRouter);
router.use(reportsRouter);
router.use(curriculumTemplatesRouter);
router.use(paymentsRouter);
router.use(settingsRouter);
router.use(analyticsRouter);
router.use(semesterQpsRouter);
router.use(iaPapersRouter);

export default router;
