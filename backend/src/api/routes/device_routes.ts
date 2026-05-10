import { Router } from "express";
import {
    getGnssDataByDeviceId,
    get_user_devices_latest_positions,
    get_gnss_user_device,
    get_deviceID_by_userID,
    get_all_deviceID_by_userID,
    add_new_device,
    add_device_arealocation,
    get_user_arealocations,
    get_gnss_data_for_arealocation,
    get_user_devices_status,
} from "../../db/db.js";

import { device_param, work_area_payload } from "../../types.js";
import { checkGeofenceStatus } from "../../utils/geofence.js";

const router = Router();

router.post("/register", async (req, res) => {
    try {
        const device: device_param = req.body;

        const data = await add_new_device(
            device.user_ID,
            device.device_name,
            device.device_serienumber,
        );

        console.log("data: ", data);

        if (data?.success === 1) {
            return res.status(200).json({
                success: true,
                data,
            });
        }

        return res.status(400).json({
            success: false,
            message: data?.message ?? "Device could not be registered",
        });
    } catch (error) {
        console.error("Failed to register device:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to register device",
        });
    }
});

router.get("/gnss/user/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);

        const data = await get_user_devices_latest_positions(user_ID);

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

router.get("/user/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);

        const data = await get_deviceID_by_userID(user_ID);

        if (data.length > 0) {
            console.log(data[0].device_ID);

            const device_ID = data[0].device_ID;
            res.json({ success: true, device_ID: device_ID });
        } else {
            res.json({ success: false, msg: "No userid attach to deviceID" });
        }
    } catch (error) {
        console.error("Failed to get device_ID:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get device_ID",
        });
    }
});

router.get("/all/user/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);

        const data = await get_all_deviceID_by_userID(user_ID);

        if (data.length > 0) {
            res.json({ success: true, devices: data });
        } else {
            res.json({ success: false, msg: "No userid attach to deviceID" });
        }
    } catch (error) {
        console.error("Failed to get device_ID:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get device_ID",
        });
    }
});

router.post("/add/location_area", async (req, res) => {
    try {
        const payload: work_area_payload = req.body;

        console.log("payload: ", payload);

        const response = await add_device_arealocation(
            payload.user_ID,
            payload.device_ID,
            payload.lon,
            payload.lat,
            payload.circle_radius_m,
            payload.matchedAddress,
        );

        console.log(response);
        res.json({ success: true, data: response });
    } catch (err) {
        console.error("Failed to insert device location area ", err);
        res.status(500).json({
            success: false,
            message: "Failed to insert device location area",
        });
    }
});

router.get("/get/location_areas/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);

        const data = await get_user_arealocations(user_ID);

        if (data.length > 0) {
            res.json({ success: true, devices: data });
        } else {
            res.json({
                success: false,
                msg: "No userid attach to area locations",
            });
        }
    } catch (error) {
        console.error("Failed to get area locations", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get area locations",
        });
    }
});

router.get("/get/gnss/arealocation/:user_ID", async (req, res) => {
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

router.get("/get/status/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);

        const data = await get_user_devices_status(user_ID);

        if (data.length > 0) {
            console.log(data);
            res.json({ success: true, data });
        } else {
            res.json({
                success: false,
                msg: "no devices register to user and cannot get device status",
            });
        }
    } catch (error) {
        console.error("Failed to get device status:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get device status",
        });
    }
});

export default router;
