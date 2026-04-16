/**
 * HOPNet — Person Controller (v2 / Neo4j)
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin HTTP adapter between Express routes and the person.service layer.
 *
 * Responsibilities:
 *   - Parse and coerce request params / body
 *   - Call the appropriate service function
 *   - Serialize the result as JSON
 *   - Pass errors to next() for the shared errorHandler
 *
 * NOT responsible for:
 *   - Business logic (that lives in person.service)
 *   - Validation beyond parsing (service validates)
 *   - Error → HTTP status mapping (that lives in errorHandler.ts)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Request, Response, NextFunction } from 'express';
import * as personSvc from '../services/person.service';
import type { NodeType } from '../domain/person';

// ── POST /api/v2/persons ───────────────────────────────────────────────────
// Body: CreatePersonServiceInput
// Response 201: PersonNode
export async function createPerson(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const person = await personSvc.createPerson(req.body);
    res.status(201).json(person);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v2/persons ────────────────────────────────────────────────────
// Query: ?nodeType=REAL|DEMO  ?limit=100  ?skip=0
// Response 200: PersonNode[]
export async function listPersons(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const nodeType = req.query['nodeType'] as NodeType | undefined;
    const limit = req.query['limit'] !== undefined
      ? Math.max(1, Math.min(500, parseInt(req.query['limit'] as string, 10) || 100))
      : 100;
    const skip = req.query['skip'] !== undefined
      ? Math.max(0, parseInt(req.query['skip'] as string, 10) || 0)
      : 0;

    const persons = await personSvc.listPersons({ nodeType, limit, skip });
    res.json({ data: persons, count: persons.length });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v2/persons/search ─────────────────────────────────────────────
// Query: ?q=<text>  ?nodeType=REAL|DEMO  ?limit=20
// Response 200: PersonNode[]
export async function searchPersons(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = (req.query['q'] as string) ?? '';
    const nodeType = req.query['nodeType'] as NodeType | undefined;
    const limit = req.query['limit'] !== undefined
      ? Math.max(1, Math.min(100, parseInt(req.query['limit'] as string, 10) || 20))
      : 20;

    const persons = await personSvc.searchPersons({ query, nodeType, limit });
    res.json({ data: persons, count: persons.length });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v2/persons/:id ────────────────────────────────────────────────
// Param: id (UUID)
// Response 200: PersonNode  |  404 NODE_NOT_FOUND
export async function getPersonById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const person = await personSvc.getPersonById(req.params['id'] as string);
    res.json(person);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v2/persons/by-public-id/:publicId ────────────────────────────
// Param: publicId (e.g. HNP-000001)
// Response 200: PersonNode  |  404 NODE_NOT_FOUND
export async function getPersonByPublicId(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const person = await personSvc.getPersonByPublicId(
      req.params['publicId'] as string
    );
    res.json(person);
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/v2/persons/:id ─────────────────────────────────────────────
// Param: id (UUID)
// Body: UpdatePersonInput (sparse — only provided fields are written)
// Response 200: PersonNode  |  404 NODE_NOT_FOUND  |  422 NODE_TYPE_IMMUTABLE
export async function updatePerson(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const person = await personSvc.updatePerson(
      req.params['id'] as string,
      req.body
    );
    res.json(person);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/v2/persons/:id ────────────────────────────────────────────
// Param: id (UUID)
// Soft-delete only — sets deletedAt, preserves relationships
// Response 204 No Content  |  404 NODE_NOT_FOUND  |  409 NODE_ALREADY_DELETED
export async function softDeletePerson(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await personSvc.softDeletePerson(req.params['id'] as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ── POST /api/v2/persons/:id/restore ──────────────────────────────────────
// Param: id (UUID)
// Clears deletedAt; preserved relationships become eligible to appear again
// Response 200: PersonNode  |  404 NODE_NOT_FOUND  |  409 NODE_NOT_DELETED
export async function restorePerson(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const person = await personSvc.restorePerson(req.params['id'] as string);
    res.json(person);
  } catch (err) {
    next(err);
  }
}
