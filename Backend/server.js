const express = require("express");
const WebSocket = require("ws");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
const PORT = 4000;

app.use(cors());

const server = app.listen(PORT, () => {
  console.log(`HTTP Server running on http://localhost:${PORT}`);
});

// WebSocket Server on same server
const wss = new WebSocket.Server({ server });

function parseRSSI(output) {
  const match = output.match(/Signal\s+:\s+(\d+)%/);
  return match ? parseInt(match[1], 10) : null;
}

function estimateDistance(rssiPercent) {
  if (rssiPercent >= 90) return 1;
  if (rssiPercent >= 80) return 3;
  if (rssiPercent >= 70) return 6;
  if (rssiPercent >= 60) return 10;
  if (rssiPercent >= 50) return 15;
  if (rssiPercent >= 40) return 20;
  return 30;
}

let currentCoords = { lat: 9.2453, lng: 7.3381 }; // Start at Veritas

function moveCoordsBasedOnSignal(rssi) {
  const distance = estimateDistance(rssi);
  const direction = rssi < 60 ? -1 : 1;
  const step = 0.00005 * direction;

  currentCoords.lat += step * (Math.random() + 0.5);
  currentCoords.lng += step * (Math.random() + 0.5);

  return { ...currentCoords, distance };
}

setInterval(() => {
  exec("netsh wlan show interfaces", (err, stdout) => {
    if (err) return console.error("PowerShell Error:", err.message);

    const rssi = parseRSSI(stdout);
    if (rssi !== null) {
      const coords = moveCoordsBasedOnSignal(rssi);
      const payload = JSON.stringify({
        rssi,
        distance: coords.distance,
        coords: { lat: coords.lat, lng: coords.lng },
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });

      console.log(`RSSI: ${rssi}%, Distance: ${coords.distance}m`, coords);
    }
  });
}, 5000);
