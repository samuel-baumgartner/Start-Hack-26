#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>

const uint8_t STEP_PIN = D2;
const uint8_t DIR_PIN = D5;

// true  -> start/stop via HiveMQ over internet
// false -> local mode: wait 5s, run 5s, stop
const bool USE_INTERNET_CONTROL = true;

// Local WiFi credentials. Replace locally before flashing firmware.
const char* WIFI_SSID = "REPLACE_WITH_WIFI_SSID";
const char* WIFI_PASSWORD = "REPLACE_WITH_WIFI_PASSWORD";

// HiveMQ endpoint and command channel.
const char* MQTT_HOST = "broker.hivemq.com";
const IPAddress MQTT_HOST_IP(35, 158, 68, 5); // IPv4 fallback for hotspot/DNS issues.
const bool USE_MQTT_IP = true;
const uint16_t MQTT_PORT = 1883;
const char* MQTT_TOPIC = "hackathon/replace-me/motor-board/cmd";

// Shared secret embedded in payload to reduce accidental/guessable control.
const char* CMD_TOKEN = "REPLACE_WITH_MOTOR_TOKEN";

const unsigned int STEP_INTERVAL_US = 1000; // Lower value = faster spin.
const unsigned int STEP_HIGH_US = 10;
const unsigned long LOCAL_START_DELAY_MS = 5000;
const unsigned long LOCAL_RUN_TIME_MS = 5000;

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
WiFiEventHandler wifiGotIpHandler;
WiFiEventHandler wifiDisconnectedHandler;

bool motorRunning = false;
unsigned long lastMqttReconnectAttemptMs = 0;
unsigned long lastWifiRetryMs = 0;
unsigned long lastStatusLogMs = 0;
unsigned long long lastStepAtUs = 0;
bool wifiConnectRequested = true;
unsigned long localBootMs = 0;
unsigned long localRunStartMs = 0;

enum class LocalMotorState {
    WaitingToStart,
    Running,
    Stopped
};

LocalMotorState localMotorState = LocalMotorState::WaitingToStart;

const char* wifiStatusToText(wl_status_t status) {
    switch (status) {
        case WL_CONNECTED:
            return "WL_CONNECTED";
        case WL_NO_SSID_AVAIL:
            return "WL_NO_SSID_AVAIL";
        case WL_CONNECT_FAILED:
            return "WL_CONNECT_FAILED";
        case WL_CONNECTION_LOST:
            return "WL_CONNECTION_LOST";
        case WL_DISCONNECTED:
            return "WL_DISCONNECTED";
        case WL_IDLE_STATUS:
            return "WL_IDLE_STATUS";
        default:
            return "WL_UNKNOWN";
    }
}

String buildExpectedPayload(const char* command) {
    String payload = command;
    payload += ":";
    payload += CMD_TOKEN;
    return payload;
}

void onMqttMessage(char* topic, uint8_t* payload, unsigned int length) {
    String message;
    message.reserve(length);
    for (unsigned int i = 0; i < length; ++i) {
        message += static_cast<char>(payload[i]);
    }

    const String runCmd = buildExpectedPayload("run");
    const String stopCmd = buildExpectedPayload("stop");

    if (message == runCmd) {
        motorRunning = true;
        Serial.println("MQTT: run command accepted");
    } else if (message == stopCmd) {
        motorRunning = false;
        digitalWrite(STEP_PIN, LOW);
        Serial.println("MQTT: stop command accepted");
    } else {
        Serial.print("MQTT: ignored payload on ");
        Serial.print(topic);
        Serial.print(" -> ");
        Serial.println(message);
    }
}

void ensureWiFiConnected() {
    if (WiFi.status() == WL_CONNECTED) {
        wifiConnectRequested = false;
        return;
    }
    if (!wifiConnectRequested) {
        return;
    }

    const unsigned long now = millis();
    if (now - lastWifiRetryMs < 5000) {
        return;
    }
    lastWifiRetryMs = now;

    Serial.print("WiFi connecting to ");
    Serial.println(WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    wifiConnectRequested = false;
}

void ensureMqttConnected() {
    if (mqttClient.connected() || WiFi.status() != WL_CONNECTED) {
        return;
    }

    const unsigned long now = millis();
    if (now - lastMqttReconnectAttemptMs < 3000) {
        return;
    }
    lastMqttReconnectAttemptMs = now;

    String clientId = "esp8266-motor-";
    clientId += String(ESP.getChipId(), HEX);

    if (mqttClient.connect(clientId.c_str())) {
        Serial.println("MQTT connected");
        if (mqttClient.subscribe(MQTT_TOPIC)) {
            Serial.print("MQTT subscribed to ");
            Serial.println(MQTT_TOPIC);
        } else {
            Serial.println("MQTT subscribe failed");
        }
    } else {
        Serial.print("MQTT connect failed, rc=");
        Serial.println(mqttClient.state());
    }
}

void runMotorIfEnabled() {
    if (!motorRunning) {
        return;
    }

    const unsigned long long nowUs = micros();
    if (nowUs - lastStepAtUs < STEP_INTERVAL_US) {
        return;
    }

    lastStepAtUs = nowUs;
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(STEP_HIGH_US);
    digitalWrite(STEP_PIN, LOW);
}

void setup() {
    Serial.begin(115200);
    delay(200);

    pinMode(DIR_PIN, OUTPUT);
    pinMode(STEP_PIN, OUTPUT);
    digitalWrite(DIR_PIN, LOW);
    digitalWrite(STEP_PIN, LOW);

    if (USE_INTERNET_CONTROL) {
        WiFi.persistent(false);
        WiFi.setAutoReconnect(true);
        WiFi.setSleepMode(WIFI_NONE_SLEEP);

        wifiGotIpHandler = WiFi.onStationModeGotIP([](const WiFiEventStationModeGotIP& event) {
            wifiConnectRequested = false;
            Serial.print("WiFi connected, IP=");
            Serial.println(event.ip);
        });
        wifiDisconnectedHandler = WiFi.onStationModeDisconnected([](const WiFiEventStationModeDisconnected& event) {
            wifiConnectRequested = true;
            Serial.print("WiFi disconnected, reason=");
            Serial.println(event.reason);
        });

        if (USE_MQTT_IP) {
            mqttClient.setServer(MQTT_HOST_IP, MQTT_PORT);
            Serial.print("MQTT endpoint IP: ");
            Serial.println(MQTT_HOST_IP);
        } else {
            mqttClient.setServer(MQTT_HOST, MQTT_PORT);
            Serial.print("MQTT endpoint host: ");
            Serial.println(MQTT_HOST);
        }
        mqttClient.setCallback(onMqttMessage);
        ensureWiFiConnected();
        Serial.println("Mode: internet control");
    } else {
        localBootMs = millis();
        localMotorState = LocalMotorState::WaitingToStart;
        Serial.println("Mode: local 5s wait -> 5s run -> stop");
    }
}

void loop() {
    if (!USE_INTERNET_CONTROL) {
        const unsigned long now = millis();
        if (localMotorState == LocalMotorState::WaitingToStart) {
            if (now - localBootMs >= LOCAL_START_DELAY_MS) {
                localMotorState = LocalMotorState::Running;
                localRunStartMs = now;
                motorRunning = true;
                Serial.println("Local: motor started");
            }
        } else if (localMotorState == LocalMotorState::Running) {
            if (now - localRunStartMs >= LOCAL_RUN_TIME_MS) {
                localMotorState = LocalMotorState::Stopped;
                motorRunning = false;
                digitalWrite(STEP_PIN, LOW);
                Serial.println("Local: motor stopped");
            }
        }

        runMotorIfEnabled();
        return;
    }

    ensureWiFiConnected();
    ensureMqttConnected();

    if (mqttClient.connected()) {
        mqttClient.loop();
    }

    runMotorIfEnabled();

    const unsigned long now = millis();
    if (now - lastStatusLogMs > 5000) {
        lastStatusLogMs = now;
        Serial.print("WiFi=");
        Serial.print(WiFi.status() == WL_CONNECTED ? "up" : "down");
        Serial.print(" (");
        Serial.print(wifiStatusToText(WiFi.status()));
        Serial.print(")");
        if (WiFi.status() == WL_CONNECTED) {
            Serial.print(" (");
            Serial.print(WiFi.localIP());
            Serial.print(")");
        }
        Serial.print(" MQTT=");
        Serial.print(mqttClient.connected() ? "up" : "down");
        Serial.print(" motor=");
        Serial.println(motorRunning ? "running" : "stopped");
    }

    yield();
}