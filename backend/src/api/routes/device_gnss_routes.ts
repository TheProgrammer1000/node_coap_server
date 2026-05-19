import { Router } from "express";
import {
    get_user_devices_latest_positions,
    get_gnss_data_for_arealocation,
} from "../../db/db.js";
import { checkGeofenceStatus } from "../../utils/geofence.js";

const router = Router();

router.get("/", async (req, res) => {
    try {
        return res.json({
            success: true,
        });
    } catch (error) {
        console.error("Failed to go to root user:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to user request",
        });
    }
});

router.get("/user/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);

        const data = await get_user_devices_latest_positions(user_ID, 1);

        if (data.length > 0) {
            console.log(data);
            res.json({ success: true, data });
        } else {
            res.json({
                success: false,
                msg: "no devices register to user and cannot get device gnss",
            });
        }
    } catch (error) {
        console.error("Failed to get GNSS data by device:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get GNSS data by device",
        });
    }
});

router.get("/user/history/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);

        const data = await get_user_devices_latest_positions(user_ID, 5);

        if (data.length > 0) {
            console.log(data);
            res.json({ success: true, data });
        } else {
            res.json({
                success: false,
                msg: "no devices register to user and cannot get device gnss",
            });
        }
    } catch (error) {
        console.error("Failed to get GNSS data by device:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get GNSS data by device",
        });
    }
});

router.get("/get/arealocation/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);
        const data = await get_gnss_data_for_arealocation(user_ID);

        if (data.length > 0) {
            // res.json({ success: true, data });

            const resultWithGeofence = data.map((row) => {
                const geofence = checkGeofenceStatus({
                    areaLat: Number(row.area_location_lat),
                    areaLon: Number(row.area_location_lon),
                    deviceLat: Number(row.device_now_lat),
                    deviceLon: Number(row.device_now_lon),
                    radiusMeters: Number(row.area_location_radius_m),
                });

                return {
                    ...row,
                    geofence_status: geofence.status,
                    distance_m: geofence.distance_m,
                    outside_by_m: geofence.outside_by_m,
                };
            });

            return res.json({
                success: true,
                data: resultWithGeofence,
            });
        } else {
            res.json({
                success: false,
                msg: "No userid with gnss data for area locations",
            });
        }
    } catch (err) {
        console.log(err);
        res.json({ success: false, msg: err });
    }
});

export default router;
