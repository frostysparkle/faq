import { Router } from "express";
import { idParamSchema, paginationQuerySchema } from "@samagama/shared/schemas";
import { HTTP_STATUS } from "../constants/httpStatus.js";
import { ROLE_GROUPS } from "../constants/roles.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const createResourceRouter = ({
  service,
  createSchema,
  updateSchema,
  readRoles = ROLE_GROUPS.READERS,
  writeRoles = ROLE_GROUPS.EDITORS
}) => {
  const router = Router();

  router.use(authenticate);

  router.get(
    "/",
    requireRole(...readRoles),
    validate(paginationQuerySchema, "query"),
    asyncHandler(async (req, res) => {
      const result = await service.list(req.query);
      sendSuccess(res, result.items, HTTP_STATUS.OK, { pagination: result.pagination });
    })
  );

  router.post(
    "/",
    requireRole(...writeRoles),
    validate(createSchema),
    asyncHandler(async (req, res) => {
      const item = await service.create(req.body, req.user.id);
      sendSuccess(res, item, HTTP_STATUS.CREATED);
    })
  );

  router.get(
    "/:id",
    requireRole(...readRoles),
    validate(idParamSchema, "params"),
    asyncHandler(async (req, res) => {
      const item = await service.getById(req.params.id);
      sendSuccess(res, item, HTTP_STATUS.OK);
    })
  );

  router.patch(
    "/:id",
    requireRole(...writeRoles),
    validate(idParamSchema, "params"),
    validate(updateSchema),
    asyncHandler(async (req, res) => {
      const item = await service.update(req.params.id, req.body, req.user.id);
      sendSuccess(res, item, HTTP_STATUS.OK);
    })
  );

  router.delete(
    "/:id",
    requireRole(...writeRoles),
    validate(idParamSchema, "params"),
    asyncHandler(async (req, res) => {
      const result = await service.remove(req.params.id, req.user.id);
      sendSuccess(res, result, HTTP_STATUS.OK);
    })
  );

  return router;
};
