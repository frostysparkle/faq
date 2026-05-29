import { Router } from "express";
import { idParamSchema, paginationQuerySchema, registerUserSchema, updateUserSchema } from "@samagama/shared/schemas";
import { HTTP_STATUS } from "../constants/httpStatus.js";
import { ROLE_GROUPS } from "../constants/roles.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { createUser, getUserById, listUsers, removeUser, updateUser } from "../services/userService.js";
import { sendSuccess } from "../utils/apiResponse.js";

const router = Router();

router.use(authenticate);
router.use(requireRole(...ROLE_GROUPS.ADMINISTRATORS));

router.get(
  "/",
  validate(paginationQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await listUsers(req.query);
    sendSuccess(res, result.items, HTTP_STATUS.OK, { pagination: result.pagination });
  })
);

router.post(
  "/",
  validate(registerUserSchema),
  asyncHandler(async (req, res) => {
    const user = await createUser(req.body, req.user.id);
    sendSuccess(res, user, HTTP_STATUS.CREATED);
  })
);

router.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.params.id);
    sendSuccess(res, user, HTTP_STATUS.OK);
  })
);

router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const user = await updateUser(req.params.id, req.body, req.user.id);
    sendSuccess(res, user, HTTP_STATUS.OK);
  })
);

router.delete(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const result = await removeUser(req.params.id, req.user.id);
    sendSuccess(res, result, HTTP_STATUS.OK);
  })
);

export default router;
