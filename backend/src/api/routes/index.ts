import { Router } from "express";

import user_routes from "./user_routes.js";
import device_routes from "./device_routes.js";
import device_gnss_routes from "./device_gnss_routes.js";

import area_location_routes from "./area_location_routes.js";
import alert_routes from "./alert_routes.js";
import ai_router from "../../ai/ai_routes.js";
import search_geocode_routes from "./search_geocode_routes.js";
import device_ble_routes from "./device_ble_routes.js";
import mock_data_routes from "./mock_data_routes.js";
import auth_routes from "./auth_routes.js";

const router = Router();

router.use("/user", user_routes);
router.use("/device", device_routes);

router.use("/device/ble", device_ble_routes);
router.use("/device/gnss", device_gnss_routes);

router.use("/device/area-location", area_location_routes);
router.use("/device/alert", alert_routes);
router.use("/device/mockdata", mock_data_routes);

router.use("/geocode", search_geocode_routes);

router.use("/ai", ai_router);
router.use("/auth", auth_routes);

export default router;
