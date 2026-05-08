import { Router } from "express";

import user_routes from "./user_routes.js";
import device_routes from "./device_routes.js";
import area_location_routes from "./area_location_routes.js";
import zone_alert_routes from "./zone_alert_routes.js";

const router = Router();

router.use("/user", user_routes);
router.use("/device", device_routes);
router.use("/area-location", area_location_routes);
router.use("/zone-alert", zone_alert_routes);

export default router;
