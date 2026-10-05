/* Runs the match engine off the main thread so the page stays smooth while a match is built. */
import { simulateMatch, digest } from "./engine.js";
self.onmessage = e => {
  const { id, input } = e.data || {};
  try {
    const r = simulateMatch(input);
    r.digest = digest(r);
    delete r.dbg;
    const R = r.rec;
    self.postMessage({ id, res: r }, [R.X.buffer, R.Y.buffer, R.F.buffer, R.BX.buffer, R.BY.buffer, R.BZ.buffer, R.OW.buffer, R.PO.buffer, R.CL.buffer, R.MD.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String((err && err.stack) || err) });
  }
};
