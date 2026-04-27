import { Router } from "express";

import gnssRoutes from "./gnss_routes.js";
import user_routes from "./user_routes.js";

const router = Router();
router.use("/gnss", gnssRoutes);
router.use("/user", user_routes);

export default router;
