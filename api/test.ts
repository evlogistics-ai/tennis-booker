export default function handler(req: any, res: any) {
  res.status(200).json({ works: true, method: req.method, url: req.url });
}
