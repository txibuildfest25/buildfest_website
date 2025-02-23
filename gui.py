import sys
import os
import json
import pyttsx3
from PyQt6.QtWidgets import (
    QApplication, QWidget, QLabel, QPushButton, QVBoxLayout, QComboBox, 
    QSlider, QTextBrowser, QCheckBox, QHBoxLayout
)
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QFont

# Import the DataFeel device API functions (assumed installed)
from datafeel.device import discover_devices

# Import our send_haptics module (make sure this file is in the same directory)
import send_haptics

class DataFeelApp(QWidget):
    # Define directories (adjust BASE_DIR as needed)
    BASE_DIR = "C:/Users/Alienware Edu/Desktop/Buildfest/buildfest_website"
    TEXT_DIR = os.path.join(BASE_DIR, "texts")
    HAPTIC_DIR = os.path.join(BASE_DIR, "haptics")
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Banned Books Immersive Experience")
        self.setGeometry(200, 200, 600, 500)
        self.layout = QVBoxLayout()
        
        # Story Selection
        self.story_label = QLabel("Choose a Story:")
        self.story_select = QComboBox()
        self.story_select.addItems([
            "Giver", "Example Text", "Example Text 2", 
            "James Giant Peach", "Perks of Being Wallflower", "The Great Gatsby"
        ])
        self.story_select.currentIndexChanged.connect(self.load_story)
        
        # Accessibility: Dyslexia-friendly and Atkinson Hyperlegible toggles
        self.dyslexia_font = QCheckBox("Enable Dyslexia-Friendly Font (OpenDyslexic)")
        self.dyslexia_font.stateChanged.connect(self.update_font)
        self.hyperlegible_font = QCheckBox("Enable Atkinson Hyperlegible Font")
        self.hyperlegible_font.stateChanged.connect(self.update_font)
        
        # Additional accessibility: font size slider
        self.font_size_label = QLabel("Font Size:")
        self.font_size_slider = QSlider(Qt.Orientation.Horizontal)
        self.font_size_slider.setMinimum(10)
        self.font_size_slider.setMaximum(36)
        self.font_size_slider.setValue(16)
        self.font_size_slider.valueChanged.connect(self.update_font_size)
        
        # Pace Control
        self.pace_label = QLabel("Reading Pace (seconds per sentence):")
        self.pace_slider = QSlider(Qt.Orientation.Horizontal)
        self.pace_slider.setMinimum(1)
        self.pace_slider.setMaximum(10)
        self.pace_slider.setValue(2)
        
        # Book Text Display
        self.book_text = QTextBrowser()
        self.default_font = self.book_text.font()
        
        # TTS Controls
        self.play_button = QPushButton("Play Narration")
        self.play_button.clicked.connect(self.start_narration)
        
        # Connect to DataFeel Devices
        self.connect_button = QPushButton("Connect to DataFeel")
        self.connect_button.clicked.connect(self.connect_to_datafeel)
        
        # Add widgets to layout
        self.layout.addWidget(self.story_label)
        self.layout.addWidget(self.story_select)
        self.layout.addWidget(self.dyslexia_font)
        self.layout.addWidget(self.hyperlegible_font)
        h_layout = QHBoxLayout()
        h_layout.addWidget(self.font_size_label)
        h_layout.addWidget(self.font_size_slider)
        self.layout.addLayout(h_layout)
        self.layout.addWidget(self.pace_label)
        self.layout.addWidget(self.pace_slider)
        self.layout.addWidget(self.book_text)
        self.layout.addWidget(self.play_button)
        self.layout.addWidget(self.connect_button)
        self.setLayout(self.layout)
        
        # Initialize variables
        self.sentences = []
        self.current_sentence_index = 0
        self.haptic_data = None
        self.datafeel_devices = []  # List of connected devices
        self.tts_engine = pyttsx3.init()
        
        # Load the default story
        self.load_story()
    
    def update_font(self):
        font = QFont()
        if self.dyslexia_font.isChecked():
            font.setFamily("OpenDyslexic")
        elif self.hyperlegible_font.isChecked():
            font.setFamily("Atkinson Hyperlegible")
        else:
            font = self.default_font
        self.book_text.setFont(font)
    
    def update_font_size(self):
        size = self.font_size_slider.value()
        font = self.book_text.font()
        font.setPointSize(size)
        self.book_text.setFont(font)
    
    def connect_to_datafeel(self):
        print("Scanning for DataFeel devices...")
        try:
            self.datafeel_devices = discover_devices(4)
            if self.datafeel_devices:
                print(f"Connected to {len(self.datafeel_devices)} DataFeel devices:")
                for device in self.datafeel_devices:
                    print(device)
            else:
                print("No DataFeel devices found.")
        except Exception as e:
            print("Error connecting to DataFeel devices:", e)
    
    def load_story(self):
        """Load the selected story text and haptic JSON, reset narration."""
        story_id = self.story_select.currentText().replace(" ", "_").lower()
        text_file = os.path.join(self.TEXT_DIR, f"{story_id}.txt")
        json_file = os.path.join(self.HAPTIC_DIR, f"{story_id}_haptic_output.json")
        self.current_sentence_index = 0
        self.sentences = []
        # Load text
        if not os.path.exists(text_file):
            print(f"Story text file not found: {text_file}")
        else:
            try:
                with open(text_file, "r", encoding="utf-8") as f:
                    text = f.read()
                    self.sentences = text.split(". ")  # Basic splitting; improve as needed
                    self.book_text.setText(text)
                print(f"Loaded story text: {text_file}")
            except Exception as e:
                print("Error reading story file:", e)
        # Load haptic JSON
        if not os.path.exists(json_file):
            print(f"Haptic JSON file not found: {json_file}")
        else:
            try:
                with open(json_file, "r") as f:
                    self.haptic_data = json.load(f)
                print(f"Loaded haptic JSON: {json_file}")
            except Exception as e:
                print("Error reading haptic JSON:", e)
        # Reset TTS
        self.tts_engine.stop()
    
    def start_narration(self):
        if not self.sentences:
            print("No story loaded.")
            return
        self.current_sentence_index = 0
        self.speak_sentence()
    
    def speak_sentence(self):
        if self.current_sentence_index >= len(self.sentences):
            print("Narration complete.")
            return
        sentence = self.sentences[self.current_sentence_index]
        print(f"Narrating: {sentence}")
        self.tts_engine.say(sentence)
        self.tts_engine.runAndWait()
        # Send haptic feedback for this sentence
        if self.haptic_data:
            self.send_haptic_feedback()
        self.current_sentence_index += 1
        QTimer.singleShot(self.pace_slider.value() * 1000, self.speak_sentence)
    
    def send_haptic_feedback(self):
        if not self.datafeel_devices:
            print("No DataFeel devices connected.")
            return
        # Sentence numbers in JSON are 1-indexed
        sentence_data = next((h for h in self.haptic_data if h["sentence_number"] == self.current_sentence_index + 1), None)
        if not sentence_data:
            print("No haptic data for this sentence.")
            return
        for command_set in sentence_data["haptic_commands"]:
            address = command_set["address"]
            # Here, assume each device object has an attribute 'id' that matches the address.
            device = next((d for d in self.datafeel_devices if getattr(d, 'id', None) == address), None)
            if not device:
                print(f"No device found for address {address}.")
                continue
            print(f"Sending haptic commands to device at address {address}...")
            for command in command_set["commands"]:
                print(f"Sending command: {command}")
                # Send Vibration
                if "vibration" in command:
                    vib = command["vibration"]
                    device.registers.set_vibration_mode(1)  # MANUAL mode
                    device.registers.set_vibration_intensity(vib["intensity"])
                    device.registers.set_vibration_frequency(vib["frequency"])
                # Send Thermal
                if "thermal" in command:
                    therm = command["thermal"]
                    device.activate_thermal_intensity_control(therm["intensity"])
                # Send LED
                if "light" in command:
                    light = command["light"]
                    r, g, b = light["rgb"]
                    brightness = int(light["intensity"] * 255)
                    device.set_led(r, g, b, brightness)
            print(f"Haptic feedback sent to device {address}.")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = DataFeelApp()
    window.show()
    sys.exit(app.exec())
