import { Response, Request } from "express";
import { StatusCodes } from "http-status-codes";

export function handleETag(
  req: Request,
  res: Response,
  resource: { updatedAt?: Date; version?: number; [key: string]: any }
): boolean {
  const etagValue =
    resource.version !== undefined
      ? `"v${resource.version}"`
      : resource.updatedAt
        ? `"${resource.updatedAt.getTime()}"`
        : `"${JSON.stringify(resource).length}"`;

  if (req.headers["if-none-match"] === etagValue) {
    res.status(StatusCodes.NOT_MODIFIED).end();
    return true;
  }

  res.setHeader("ETag", etagValue);
  return false;
}
