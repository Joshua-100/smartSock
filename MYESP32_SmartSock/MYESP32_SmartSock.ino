#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Sensor Pins
const int HEEL_PIN = 25;    // GPIO25 for heel strike
const int TOE_PIN = 26;     // GPIO26 for toe push
const int LED_PIN = 2;      // Visual indicator
const int BUZZER_PIN = 27;  // Passive buzzer GPIO27

// Gait Detection Thresholds
const int HEEL_THRESH = 3;
const int TOE_THRESH = 1;
const int GAIT_TIME_MS = 500;  // Max time between heel strike and toe push

// BLE UUIDs 
#define SERVICE_UUID           "12345678-1234-1234-1234-123456789abc"
#define PRESSURE_CHAR_UUID     "abcd1234-5678-90ab-cdef-1234567890ab"

// BLE Objects
BLECharacteristic *pressureCharacteristic;

// State Tracking
enum GaitState { SLEEPING, HEEL_STRIKE, TOE_PUSH, WALKING };
GaitState currentState = SLEEPING;
unsigned long gaitTimer = 0;

// Current pressure value to send over BLE
int currentPressureValue = 0;


// In Caseclient disconets, we need to restart server so other devices that are able to connect can connect
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    // Serial.println("BLE client connected");
  }

  void onDisconnect(BLEServer* pServer) {
    // Serial.println("BLE client disconnected, restarting advertising...");
    delay(100); // Small delay to allow stack to reset
    BLEDevice::getAdvertising()->start();  // Restart advertising
  }
};


void setup() {
  // Serial.begin(115200);


  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  noTone(BUZZER_PIN);  // Ensure buzzer off at start

  BLEDevice::init("SmartSockESP32");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks()); // Handle disconnects

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pressureCharacteristic = pService->createCharacteristic(
    PRESSURE_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );

  pressureCharacteristic->addDescriptor(new BLE2902());

  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();

  // Serial.println("BLE service started");
  // Serial.println("Sleepwalking Detection System Ready");
}


void loop() {
  int heel = analogRead(HEEL_PIN);
  int toe = analogRead(TOE_PIN);

  // Update current pressure (sum of heel + toe sensor readings)
  currentPressureValue = heel + toe;

  // State Machine for gait detection
  switch (currentState) {
    case SLEEPING:
      noTone(BUZZER_PIN);
      digitalWrite(LED_PIN, LOW);
      if (heel > HEEL_THRESH) {
        currentState = HEEL_STRIKE;
        gaitTimer = millis();
        // Serial.println("Heel strike detected");
      }
      break;

    case HEEL_STRIKE:
      if (toe > TOE_THRESH) {
        currentState = TOE_PUSH;
        // Serial.println("Toe push detected");
      } else if (millis() - gaitTimer > GAIT_TIME_MS) {
        currentState = SLEEPING;
      }
      break;

    case TOE_PUSH:
      // Serial.println("WALKING CONFIRMED - BUZZER ON");
      digitalWrite(LED_PIN, HIGH);
      tone(BUZZER_PIN, 1000);  // 1kHz tone
      gaitTimer = millis();
      currentState = WALKING;
      break;

    case WALKING:
      if (heel < HEEL_THRESH && toe < TOE_THRESH) {
        if (millis() - gaitTimer > 3000) {  // 3s no activity
          currentState = SLEEPING;
          // Serial.println("Returned to sleep - BUZZER OFF");
          noTone(BUZZER_PIN);
          digitalWrite(LED_PIN, LOW);
        }
      } else {
        gaitTimer = millis(); // reset inactivity timer
      }
      break;
  }

// Testing Code to see values for Heel & Toe
// String gaitStatusStr = "HEEL=" + String(heel) + " TOE=" + String(toe) + " STATE=";

String gaitStatusStr;
switch (currentState) {
  case SLEEPING: gaitStatusStr += "SLEEPING"; break;
  case HEEL_STRIKE: gaitStatusStr += "HEEL_STRIKE"; break;
  case TOE_PUSH: gaitStatusStr += "TOE_PUSH"; break;
  case WALKING: gaitStatusStr += "WALKING"; break;
}

pressureCharacteristic->setValue(gaitStatusStr.c_str());
pressureCharacteristic->notify();


  delay(500);  // Update BLE every second
}