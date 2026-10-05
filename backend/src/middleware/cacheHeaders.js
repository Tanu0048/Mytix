export function cacheHeaders(seconds = 15) {
  return (req, res, next) => {
    if (req.method === "GET") {
      res.set("Cache-Control", `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`);
    } else {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    }
    next();
  };
}
