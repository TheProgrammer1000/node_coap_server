import { Router } from "express";

import gnssRoutes from "./gnss_routes.js";

const router = Router();
router.use("/gnss", gnssRoutes);

export default router;
