import { Router, Request, Response } from "express";

const healthRouter = Router();

/** GET /api/v1/health
 * Returns the API health status.
 * Does NOT require a database connection; it reflects API process health only.
 */
healthRouter.get("/health", (_req: Request, res: Response) => {
  const body = {
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0",
    },
  };
  res.status(200).json(body);
});

export { healthRouter };
