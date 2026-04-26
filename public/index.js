let map = L.map("map").setView([59.33, 18.06], 13);
let popup = L.popup();

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

let markerLayer = L.layerGroup().addTo(map);

function onMapClick(e) {
    popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(map);
}

map.on("click", onMapClick);

async function loadGnssData() {
    try {
        const response = await fetch("/api/gnss/device/123456");

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            console.error("API returned error:", result);
            return;
        }

        const points = result.data;

        markerLayer.clearLayers();

        if (points.length === 0) {
            console.log("No GNSS points found");
            return;
        }

        points.forEach((point) => {
            const lat = Number(point.lat);
            const lon = Number(point.lon);
            const acc = point.acc === null ? null : Number(point.acc);

            if (Number.isNaN(lat) || Number.isNaN(lon)) {
                return;
            }

            const marker = L.marker([lat, lon]).addTo(markerLayer);

            marker.bindPopup(`
                <strong>Device:</strong> ${point.device_ID}<br>
                <strong>Lat:</strong> ${lat}<br>
                <strong>Lon:</strong> ${lon}<br>
                <strong>Accuracy:</strong> ${point.acc ?? "N/A"}<br>
                <strong>Time:</strong> ${point.data_timestamp ?? "N/A"}
            `);

            if (acc !== null && !Number.isNaN(acc)) {
                L.circle([lat, lon], {
                    radius: acc,
                    color: "red",
                    fillColor: "#f03",
                    fillOpacity: 0.2,
                }).addTo(markerLayer);
            }
        });

        const firstPoint = points[0];
        map.setView([Number(firstPoint.lat), Number(firstPoint.lon)], 14);
    } catch (error) {
        console.error("Failed to load GNSS data:", error);
    }
}

loadGnssData();
setInterval(loadGnssData, 5000);
