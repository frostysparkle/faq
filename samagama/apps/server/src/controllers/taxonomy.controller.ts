import type { Request, Response } from "express";
import { created, ok } from "../utils/apiResponse.js";
import * as taxonomyService from "../services/taxonomy.service.js";
import { requiredParam } from "../utils/request.js";

export async function listCategories(_req: Request, res: Response) {
  ok(res, await taxonomyService.listCategories());
}

export async function listTags(_req: Request, res: Response) {
  ok(res, await taxonomyService.listTags());
}

export async function createCategory(req: Request, res: Response) {
  created(res, await taxonomyService.createCategory(req.body));
}

export async function createTag(req: Request, res: Response) {
  created(res, await taxonomyService.createTag(req.body));
}

export async function updateCategory(req: Request, res: Response) {
  ok(res, await taxonomyService.updateCategory(requiredParam(req, "id"), req.body));
}

export async function updateTag(req: Request, res: Response) {
  ok(res, await taxonomyService.updateTag(requiredParam(req, "id"), req.body));
}

export async function archiveCategory(req: Request, res: Response) {
  ok(res, await taxonomyService.archiveCategory(requiredParam(req, "id")));
}

export async function archiveTag(req: Request, res: Response) {
  ok(res, await taxonomyService.archiveTag(requiredParam(req, "id")));
}

export async function suggestTags(req: Request, res: Response) {
  ok(res, await taxonomyService.suggestTags(req.body.text));
}
