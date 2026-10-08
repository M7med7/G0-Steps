# FootGuard pressure platform firmware

Firmware for the ESP32-S3-N16R8 that reads the 8 FSR402 sensors and streams them to the screening app over a USB cable.

> **Status:** written against the Arduino-ESP32 core, but **not yet compiled or run on the board**: the hardware isn't wired yet. Treat the first upload as the first test.

## What it does

- Reads 8 sensors 20 times a second, averages 4 samples per reading, and smooths between frames.
- Prints one line per frame: `{"raw":[a0,a1,a2,a3,a4,a5,a6,a7]}`. Each value is a 12-bit ADC reading (0–4095).
- On boot it prints `{"hello":"footguard","fw":"0.1.0","sensors":8}`, which the app ignores.
- It does **not** calibrate. The app does that (see below), so calibration can be redone without reflashing.

## Wiring

Each FSR402 is wired as a voltage divider. The more weight on the sensor, the higher the voltage:

```
3V3 ──── FSR402 ────┬──── ADC pin
                    │
                  10 kΩ
                    │
GND ────────────────┘
```

| # | Sensor | Foot | ESP32-S3 pin |
|---|--------|------|--------------|
| 1 | Big toe | Left | GPIO1 |
| 2 | Inner forefoot | Left | GPIO2 |
| 3 | Outer forefoot | Left | GPIO4 |
| 4 | Heel | Left | GPIO5 |
| 5 | Big toe | Right | GPIO6 |
| 6 | Inner forefoot | Right | GPIO7 |
| 7 | Outer forefoot | Right | GPIO8 |
| 8 | Heel | Right | GPIO9 |

- Only ADC1 pins are used. ADC2 stops working once Wi-Fi is on, and we may add Wi-Fi later.
- GPIO3 is skipped because it's a strapping pin.
- "Left" and "right" are the pilgrim's feet. The order must stay the same as `SENSOR_ORDER` in `src/models/pressureProtocol.ts`.
- **Resistor value:** 10 kΩ is a starting point. An FSR402 is built for roughly 0.1–10 kg on its 13 mm disc, and a standing adult puts much more than that on the platform. If several sensors read close to 4095 while someone stands, they are saturated: try 4.7 kΩ or 3.3 kΩ, or spread the load with the supports layer. The mechatronics member should decide this; it changes how useful the readings are.

## Upload (Arduino IDE 2)

1. **Boards Manager:** install **esp32 by Espressif Systems** (version 3.x).
2. **Board:** select **ESP32S3 Dev Module**.
3. **Cable:** plug into the board's **UART / COM** USB port. If you use the native **USB** port instead, set **Tools → USB CDC On Boot → Enabled**.
4. **Port:** pick the board's port, open `footguard-esp32.ino`, then click **Upload**.
5. **Check:** open **Serial Monitor** at **115200** baud. You should see the hello line, then about 20 `{"raw":[…]}` lines per second. Press each sensor and watch its value rise.

Close the Serial Monitor before connecting the app. Only one program can hold the port at a time.

## Connect the app

1. Open the app in **Chrome or Edge on a computer**. Safari, Firefox and phones don't support Web Serial.
2. In the review bar, set **Sensor** to **ESP32 (USB)**, click **Connect**, then pick the board's port.
3. **Calibrate.** Calibration is saved in this browser and survives a reload.
   - **1 · Zero:** with nobody on the platform, click it and wait 2 s.
   - **2 · Reference:** click it, then press each of the 8 sensors in turn with the same weight (for example a 2 kg weight) within 12 s. Each sensor's peak becomes its "full load".
   - Any sensor that didn't rise enough is listed under **No response**. Check its wiring and repeat the reference step.
4. **Scan:** run a screening. The scan records for 4 s while the pilgrim stands still, then averages the readings.

## Troubleshooting

| What you see | Likely cause |
|--------------|--------------|
| **Connect** is disabled; it says it needs Chrome or Edge | The browser has no Web Serial |
| No port in the picker | Wrong USB port on the board, a charge-only cable, or a missing USB driver |
| "The platform stopped sending readings" | Serial Monitor still open, wrong baud rate, or the board reset |
| "No feet detected" | The total load is below the threshold. Run the zero step again with the platform empty, then check the wiring |
| One zone always reads 0 % or 100 % | That sensor's wire or resistor, or it's on the wrong pin |
