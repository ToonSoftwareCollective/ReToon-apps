# Toon Thermostaat

A ReToon thermostat card inspired by the original Toon thermostat tile and styled for ReToon’s dark theme. It shows the room temperature,
target temperature, current preset, and a flame that turns orange while heating.
Use the + and − buttons to adjust the target in 0.5 °C steps. The four preset
buttons are labelled in Dutch (Weg, Thuis, Slapen, and Comfort).

## Setup

Add an **App** card, choose **Toon Thermostaat**, and size it to at least
**4 × 5** (columns × rows). All controls are on the card.

The app uses the Toon's local MQTT broker. It reads thermostat state from
`retoon/boiler` and sends target and preset commands to `retoon/boiler/set`.
It requires a working local ReToon thermostat. The app runs without Home Assistant or external accounts.
