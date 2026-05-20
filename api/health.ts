// Vercel serverless function — GET /api/health
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handler(_req: any, res: any) {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    status: "ok",
    service: "SmartAudit AI Backend",
    validators: 4,
    environment: "vercel",
  });
}
