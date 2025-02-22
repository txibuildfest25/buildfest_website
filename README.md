Overview

This system analyzes text on a sentence-by-sentence basis. It uses:
Rule‑based Analysis:
A lexicon of keywords and multi‑word expressions (MWEs) to detect emotions like Fear, Anxiety, Sadness, Sorrow, Guilt, Regret, Awe, Caution, Relief, Acceptance, Protection, and Concern.
Machine Learning Analysis:
A pre‑trained transformer-based emotion classifier (from Hugging Face) that outputs emotion probabilities for labels such as anger, disgust, fear, joy, sadness, and surprise. These labels are mapped to our more granular emotion categories.
Blending:
The outputs of both methods are blended (using a configurable weight) and then normalized. Low-intensity emotion scores are filtered out to focus on the dominant emotional cues.
Visualization:
An emotion timeline is generated to visualize the raw blended emotion scores across the text.
Haptic Command Generation:
The normalized emotion scores are used to generate haptic commands (vibration, thermal, and light) based on a pre-defined mapping that adheres to the DataFeel hardware specifications.
Hardware Specifications

DataFeel Dev Kit ("El Jefe")
Dimensions: 104 mm x 56 mm x 26 mm
Battery Capacity: 22 Watt-Hours
Battery Size: 18650 x 2
Run Time: 60–90 minutes (constant use)
Charging Time: 2–3 hours
Connectivity: USB, Bluetooth
DataFeel Dots
Dimensions: 42 mm x 42 mm x 14.5 mm
Heat Pumping Rate: Up to 3.4 W
Temperature Range: 4–50°C
Temperature Rate Change: ~3.2°C per second
Power Consumption: Up to 2.0 W
Vibration Frequency Range: 140 Hz to 210 Hz
Vibration Force: Up to 1.5G RMS
LEDs: 8 embedded control color LEDs
IMU: 6-axis (gyro/accel)
Temperature Sensors: 3 (board, heat sink, skin)
Emotions and Haptic Mapping

The system detects the following emotions:
Fear
Anxiety
Sadness
Sorrow
Guilt
Regret
Awe
Caution
Relief
Acceptance
Protection
Concern
Haptic Mapping (Based on DataFeel Specs)
For each emotion, the system maps the detected intensity to specific haptic outputs:
Fear:
Vibration: Intensity 0.9, Frequency 190 Hz, Pattern: "rapid_pulse"
Thermal: Temperature 10°C (cool), Intensity 0.8
Light: Color blue, Intensity 0.7
Anxiety:
Vibration: Intensity 0.7, Frequency 180 Hz, Pattern: "jittery"
Thermal: Temperature 10°C (cool), Intensity 0.6
Light: Color light_blue, Intensity 0.5
Sadness:
Vibration: Intensity 0.5, Frequency 170 Hz, Pattern: "slow_pulse"
Thermal: Temperature 25°C (neutral), Intensity 0.4
Light: Color gray, Intensity 0.4
Sorrow:
Vibration: Intensity 0.6, Frequency 175 Hz, Pattern: "deep_pulse"
Thermal: Temperature 10°C (cool), Intensity 0.5
Light: Color indigo, Intensity 0.5
Guilt:
Vibration: Intensity 0.7, Frequency 180 Hz, Pattern: "steady_pulse"
Thermal: Temperature 30°C (mild warm), Intensity 0.6
Light: Color amber, Intensity 0.5
Regret:
Vibration: Intensity 0.65, Frequency 175 Hz, Pattern: "gentle_pulse"
Thermal: Temperature 20°C (mild cool), Intensity 0.5
Light: Color soft_yellow, Intensity 0.5
Awe:
Vibration: Intensity 0.5, Frequency 170 Hz, Pattern: "flowing"
Thermal: Temperature 35°C (warm), Intensity 0.5
Light: Color white, Intensity 0.8
Caution:
Vibration: Intensity 0.8, Frequency 190 Hz, Pattern: "intermittent"
Thermal: Temperature 25°C (neutral), Intensity 0.7
Light: Color red, Intensity 0.8
Relief:
Vibration: Intensity 0.4, Frequency 160 Hz, Pattern: "gentle"
Thermal: Temperature 35°C (warm), Intensity 0.7
Light: Color green, Intensity 0.7
Acceptance:
Vibration: Intensity 0.3, Frequency 160 Hz, Pattern: "soothing"
Thermal: Temperature 25°C (neutral), Intensity 0.6
Light: Color soft_white, Intensity 0.6
Protection:
Vibration: Intensity 1.0, Frequency 200 Hz, Pattern: "steady"
Thermal: Temperature 35°C (warm), Intensity 1.0
Light: Color orange, Intensity 0.9
Concern:
Vibration: Intensity 0.4, Frequency 160 Hz, Pattern: "subtle_pulse"
Thermal: Temperature 25°C (neutral), Intensity 0.4
Light: Color purple, Intensity 0.4