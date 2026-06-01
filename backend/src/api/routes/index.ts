import { Router } from "express";

import user_routes from "./user_routes.js";
import device_routes from "./device/device_routes.js";
import device_gnss_routes from "./device/device_gnss_routes.js";

import device_area_location_routes from "./device/device_area_location_routes.js";
import device_alert_routes from "./device/device_alert_routes.js";
import ai_router from "../../ai/ai_routes.js";
import search_geocode_routes from "./search_geocode_routes.js";
import device_ble_routes from "./device/device_ble_routes.js";
import device_mock_data_routes from "./device/device_mock_data_routes.js";
import auth_routes from "./auth_routes.js";
import device_status_routes from "./device/device_status_routes.js";
import device_event_routes from "./device/device_event_routes.js";
import device_firmware_routes from "./device/device_firmware_routes.js";

const router = Router();

router.use("/user", user_routes);

router.use("/device", device_routes);
router.use("/device/status", device_status_routes);
router.use("/device/event", device_event_routes);
router.use("/device/alert", device_alert_routes);

router.use("/device/ble", device_ble_routes);
router.use("/device/gnss", device_gnss_routes);
router.use("/device/area-location", device_area_location_routes);
router.use("/device/mockdata", device_mock_data_routes);

router.use("/device/firmware", device_firmware_routes);
router.use("/geocode", search_geocode_routes);
router.use("/ai", ai_router);
router.use("/auth", auth_routes);

export default router;
