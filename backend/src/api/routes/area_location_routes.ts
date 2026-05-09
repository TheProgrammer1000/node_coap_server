import { Router } from "express";
import {} from "../../db/db.js";

import fetch from "node-fetch";

import { device_param } from "../../types.js";

const router = Router();

router.post("/geocode", async (req, res) => {
    const geoarea = req.body.query;

    console.log("Has API key:", !!process.env.GEOAPIFY_API_KEY);
    // console.log("geoarea: ", geoarea);

    const geo_params = new URLSearchParams({
        text: geoarea,
        filter: "countrycode:se",
        format: "geojson",
        limit: "5",
        lang: "sv",
        apiKey: process.env.GEOAPIFY_API_KEY as string,
    });

    const geoapify_url = `https://api.geoapify.com/v1/geocode/search?${geo_params.toString()}`;

    try {
        var requestOptions = {
            method: "GET",
        };

        const response = await fetch(geoapify_url, requestOptions);
        const data: any = await response.json();

        console.log(data.features[0].properties.formatted);

        const matched_address = data.features[0].properties.formatted;
        // [longitude, latitude]
        const coordinates = data.features[0].geometry.coordinates;

        const geo_obj = {
            success: true,
            lat: coordinates[1],
            lon: coordinates[0],
            provider: "geoapify",
            matched_address: matched_address,
        };

        console.log(geo_obj);

        res.json(geo_obj);
    } catch (error) {
        console.error("Geocode backend error:", error);
        res.status(500).json({
            success: false,
            msg: "Serverfel vid geocoding",
        });
    }
});

export default router;
