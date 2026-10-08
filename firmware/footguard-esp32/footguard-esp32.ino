/*
 * FootGuard pressure platform firmware for the ESP32-S3.
 *
 * Reads the 8 FSR402 sensors and prints one JSON line per frame over USB serial:
 *   {"raw":[a0,a1,a2,a3,a4,a5,a6,a7]}
 * Each value is a 12-bit ADC reading (0–4095), in this order:
 *   left big toe, left inner forefoot, left outer forefoot, left heel,
 *   right big toe, right inner forefoot, right outer forefoot, right heel
 * That order must match SENSOR_ORDER in src/models/pressureProtocol.ts.
 *
 * The board only measures and smooths. Calibration (empty platform, reference press) happens in the app,
 * so it can be redone without reflashing.
 *
 * Wiring for each sensor (see README.md): 3V3 -> FSR402 -> ADC pin, and ADC pin -> 10 kOhm -> GND.
 */
#include <Arduino.h>

static const char *FIRMWARE_VERSION = "0.1.0";

// Must match BAUD_RATE in src/sensors/WebSerialDevice.ts.
static const uint32_t BAUD_RATE = 115200;
// 20 frames per second; the app's fake device sends at the same rate.
static const uint32_t FRAME_INTERVAL_MS = 50;

static const uint8_t SENSOR_COUNT = 8;
// ADC1 pins only (GPIO1-10 on the S3): ADC2 stops working when Wi-Fi is on, which we may add later.
// GPIO3 is skipped because it is a strapping pin.
static const uint8_t SENSOR_PINS[SENSOR_COUNT] = {1, 2, 4, 5, 6, 7, 8, 9};

// Readings averaged per sensor per frame, to cut ADC noise.
static const uint8_t SAMPLES_PER_READ = 4;
// Exponential smoothing between frames: 1.0 is no smoothing, lower is steadier but slower.
static const float SMOOTHING = 0.3f;

static float smoothed[SENSOR_COUNT];
static uint32_t lastFrameAt = 0;

static uint16_t readSensor(uint8_t pin) {
  uint32_t sum = 0;
  for (uint8_t i = 0; i < SAMPLES_PER_READ; i++) {
    sum += analogRead(pin);
  }
  return sum / SAMPLES_PER_READ;
}

void setup() {
  Serial.begin(BAUD_RATE);
  // 12-bit readings; the Arduino-ESP32 default attenuation already covers the full 0-3.3 V range.
  analogReadResolution(12);
  for (uint8_t i = 0; i < SENSOR_COUNT; i++) {
    smoothed[i] = readSensor(SENSOR_PINS[i]);
  }
  // The app ignores this line; it helps when checking the board in a serial monitor.
  Serial.printf("{\"hello\":\"footguard\",\"fw\":\"%s\",\"sensors\":%u}\n", FIRMWARE_VERSION, SENSOR_COUNT);
}

void loop() {
  const uint32_t now = millis();
  if (now - lastFrameAt < FRAME_INTERVAL_MS) {
    return;
  }
  lastFrameAt = now;

  Serial.print("{\"raw\":[");
  for (uint8_t i = 0; i < SENSOR_COUNT; i++) {
    smoothed[i] += SMOOTHING * (readSensor(SENSOR_PINS[i]) - smoothed[i]);
    Serial.print(static_cast<uint16_t>(lroundf(smoothed[i])));
    if (i < SENSOR_COUNT - 1) {
      Serial.print(',');
    }
  }
  Serial.print("]}\n");
}
