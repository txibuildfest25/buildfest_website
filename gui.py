import sys
import os
import json
import pyttsx3
from PyQt6.QtWidgets import (
    QApplication, QWidget, QLabel, QPushButton, QVBoxLayout, QComboBox,
    QSlider, QTextBrowser, QCheckBox
)
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QFont, QFontDatabase, QTextCursor
from datafeel.device import discover_devices, Dot

class DataFeelApp(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Banned Books Immersive Experience")
        self.setGeometry(200, 200, 600, 700)

        self.layout = QVBoxLayout()

        # Base directories for stories and haptics
        self.BASE_DIR = "C:/Users/Alienware Edu/Desktop/Buildfest/buildfest_website"
        self.TEXT_DIR = os.path.join(self.BASE_DIR, "texts")
        self.HAPTIC_DIR = os.path.join(self.BASE_DIR, "haptics")

        # Initialize variables
        self.sentences = []
        self.haptic_data = None
        self.current_sentence_index = 0
        self.speed_ms = 500  # Default speed in ms
        self.narration_running = False
        self.datafeel_devices = []

        # Load custom fonts
        self.load_fonts()

        # Initialize TTS engine
        self.tts_engine = pyttsx3.init()
        self.tts_engine.setProperty('rate', 150)

        # Story Selection
        self.story_label = QLabel("Choose a Story:")
        self.story_select = QComboBox()
        self.story_select.addItems([
            "Giver", "Example Text", "Example Text 2",
            "James Giant Peach", "Perks of Being a Wallflower", "The Great Gatsby"
        ])
        self.story_select.currentIndexChanged.connect(self.switch_story)

        # Accessibility Settings
        self.dyslexia_font = QCheckBox("Enable Dyslexia-Friendly Font")
        self.hyperlegible_font = QCheckBox("Enable Atkinson Hyperlegible Font")
        self.dyslexia_font.stateChanged.connect(self.apply_fonts)
        self.hyperlegible_font.stateChanged.connect(self.apply_fonts)

        # Unified Speed Control
        self.pace_label = QLabel("Reading & Narration Speed (words per second):")
        self.pace_slider = QSlider(Qt.Orientation.Horizontal)
        self.pace_slider.setMinimum(1)
        self.pace_slider.setMaximum(10)
        self.pace_slider.setValue(2)
        self.pace_slider.valueChanged.connect(self.update_speed)

        # Book Text Display
        self.book_text = QTextBrowser()

        # TTS Controls
        self.play_button = QPushButton("Play Narration")
        self.play_button.clicked.connect(self.start_narration)

        self.stop_button = QPushButton("Stop Narration")
        self.stop_button.clicked.connect(self.stop_narration)

        # Connect to DataFeel
        self.connect_button = QPushButton("Connect to DataFeel")
        self.connect_button.clicked.connect(self.connect_to_datafeel)

        # Add widgets to layout
        self.layout.addWidget(self.story_label)
        self.layout.addWidget(self.story_select)
        self.layout.addWidget(self.dyslexia_font)
        self.layout.addWidget(self.hyperlegible_font)
        self.layout.addWidget(self.pace_label)
        self.layout.addWidget(self.pace_slider)
        self.layout.addWidget(self.book_text)
        self.layout.addWidget(self.play_button)
        self.layout.addWidget(self.stop_button)
        self.layout.addWidget(self.connect_button)

        self.setLayout(self.layout)
    def load_fonts(self):
        """Load Dyslexia and Atkinson Hyperlegible fonts."""
        font_dir = r"C:/Users/Alienware Edu/Desktop/Buildfest/buildfest_website/fonts"
        dyslexia_path = os.path.join(font_dir, "OpenDyslexic-Regular.otf")
        atkinson_path = os.path.join(font_dir, "AtkinsonHyperlegibleNext-Regular.otf")

        self.dyslexia_font_id = QFontDatabase.addApplicationFont(dyslexia_path)
        if self.dyslexia_font_id == -1:
            print("❌ Dyslexia-Friendly Font Not Found")
        else:
            print("✅ Dyslexia-Friendly Font Loaded")

        self.hyperlegible_font_id = QFontDatabase.addApplicationFont(atkinson_path)
        if self.hyperlegible_font_id == -1:
            print("❌ Atkinson Hyperlegible Font Not Found")
        else:
            print("✅ Atkinson Hyperlegible Font Loaded")

    def apply_fonts(self):
        """Apply selected font based on accessibility settings."""
        if self.dyslexia_font.isChecked():
            font_family = QFontDatabase.applicationFontFamilies(self.dyslexia_font_id)[0]
            font = QFont(font_family, 12)
            self.book_text.setFont(font)
            print("Applied Dyslexia-Friendly Font")
        elif self.hyperlegible_font.isChecked():
            font_family = QFontDatabase.applicationFontFamilies(self.hyperlegible_font_id)[0]
            font = QFont(font_family, 12)
            self.book_text.setFont(font)
            print("Applied Atkinson Hyperlegible Font")
        else:
            self.book_text.setFont(QFont("Arial", 12))
            print("Applied Default Font")

    def connect_to_datafeel(self):
        """Scan and connect to all available DataFeel devices."""
        print("🔍 Scanning for DataFeel Devices...")
        self.datafeel_devices = discover_devices(4)

        if self.datafeel_devices:
            print(f"✅ Connected to {len(self.datafeel_devices)} DataFeel devices.")
            for device in self.datafeel_devices:
                print(f"  ➡️ {device}")
        else:
            print("❌ No DataFeel devices found.")

    def switch_story(self):
        """Switch to a new story and reset state."""
        print("Switching story...")
        self.stop_narration()
        self.load_story()

    def load_story(self):
        """Load the selected story text and haptic data."""
        story_id = self.story_select.currentText().replace(" ", "_").lower()

        text_file = os.path.join(self.TEXT_DIR, f"{story_id}.txt")
        json_file = os.path.join(self.HAPTIC_DIR, f"{story_id}_haptic_output.json")

        # Load text file
        if not os.path.exists(text_file):
            print(f"❌ Error: Story text file not found: {text_file}")
        else:
            try:
                with open(text_file, "r", encoding="utf-8") as f:
                    text = f.read()
                    self.sentences = text.split(". ")
                    self.book_text.setText(text)
                print(f"✅ Loaded story text: {text_file}")
            except Exception as e:
                print(f"❌ Error reading story file: {e}")

        # Load haptic JSON
        if not os.path.exists(json_file):
            print(f"❌ Error: Haptic JSON file not found: {json_file}")
        else:
            try:
                with open(json_file, "r") as file:
                    self.haptic_data = json.load(file)
                print(f"✅ Loaded haptic JSON: {json_file}")
            except Exception as e:
                print(f"❌ Error reading haptic JSON: {e}")
    def update_speed(self):
        """Update narration and reading speed based on slider value."""
        words_per_second = self.pace_slider.value()
        self.speed_ms = int(1000 / words_per_second)
        tts_rate = words_per_second * 50
        self.tts_engine.setProperty('rate', tts_rate)
        print(f"Speed set to {words_per_second} words per second.")

    def start_narration(self):
        """Start narrating the story."""
        if not self.sentences:
            print("❌ No story loaded.")
            return

        self.narration_running = True
        self.current_sentence_index = 0
        self.speak_sentence()

    def stop_narration(self):
        """Stop the current narration loop."""
        self.narration_running = False
        print("🛑 Narration stopped.")
        self.reset_haptics()

    def speak_sentence(self):
        """Speak the   current sentence and send haptic feedback."""
        if not self.narration_running or self.current_sentence_index >= len(self.sentences):
            print("✅ Narration complete.")
            return

        sentence = self.sentences[self.current_sentence_index]
        print(f"🎙️ Narrating: {sentence}")

        # Highlight the current sentence
        self.highlight_sentence(sentence)

        # Update Sentifiction Color
        self.update_sentification_color()

        # Speak the sentence
        self.tts_engine.say(sentence)
        self.tts_engine.runAndWait()

        # Send haptic feedback
        if self.haptic_data:
            self.send_haptic_feedback()

        # Move to next sentence after delay
        self.current_sentence_index += 1
        QTimer.singleShot(self.speed_ms, self.speak_sentence)

    def update_sentification_color(self):
        """Update the background color based on sentiment in the haptic JSON."""
        sentence_data = next(
            (h for h in self.haptic_data if h["sentence_number"] == self.current_sentence_index + 1),
            None
        )
        if not sentence_data:
            print(f"⚠️ No sentence data found for sentence {self.current_sentence_index + 1}.")
            self.setStyleSheet("background-color: white;")
            return

        print(f"Debug: Sentence data: {json.dumps(sentence_data, indent=2)}")

        # Loop through haptic commands to extract light data
        for command_set in sentence_data["haptic_commands"]:
            for command in command_set.get("commands", []):  # Ensure "commands" exists
                light_data = command.get("light", {})
                if light_data:
                    r, g, b = light_data.get("rgb", [255, 255, 255])  # Default to white
                    intensity = light_data.get("intensity", 1.0)
                    r, g, b = int(r * intensity), int(g * intensity), int(b * intensity)  # Scale color by intensity
                    self.setStyleSheet(f"background-color: rgb({r}, {g}, {b});")
                    print(f"Updated Sentifiction color to RGB({r}, {g}, {b}) with intensity {intensity}.")
                    return

        print("⚠️ No light data found for Sentifiction.")
        self.setStyleSheet("background-color: white;")




    def reset_haptics(self):
        """Reset all connected haptic devices."""
        for device in self.datafeel_devices:
            device.registers.set_vibration_mode(0)  # Reset vibration
            device.set_led(0, 0, 0, 0)  # Turn off LEDs
        print("Haptics reset to normal.")

    def highlight_sentence(self, sentence):
        """Highlight the sentence currently being narrated."""
        cursor = self.book_text.textCursor()
        text = self.book_text.toPlainText()
        start_index = text.find(sentence)

        if start_index != -1:
            cursor.setPosition(start_index)
            cursor.movePosition(QTextCursor.MoveOperation.Right, QTextCursor.MoveMode.KeepAnchor, len(sentence))
            self.book_text.setTextCursor(cursor)

    def send_haptic_feedback(self):
        """Send haptic commands to all connected DataFeel Dots."""
        if not self.datafeel_devices:
            print("❌ No DataFeel devices connected.")
            return

        sentence_data = next(
            (h for h in self.haptic_data if h["sentence_number"] == self.current_sentence_index + 1),
            None
        )

        if not sentence_data:
            print("⚠️ No haptic data for this sentence.")
            return

        for command_set in sentence_data["haptic_commands"]:
            address = command_set["address"]

            # Find the correct DataFeel device
            device = next((d for d in self.datafeel_devices if d.id == address), None)
            if not device:
                print(f"⚠️ No device found for address {address}, skipping...")
                continue

            print(f"🎯 Sending haptic commands to Dot {address}...")
            for command in command_set["commands"]:
                if "vibration" in command:
                    vib = command["vibration"]
                    device.registers.set_vibration_mode(1)
                    device.registers.set_vibration_intensity(vib["intensity"])
                    device.registers.set_vibration_frequency(vib["frequency"])
                if "thermal" in command:
                    therm = command["thermal"]
                    device.activate_thermal_intensity_control(therm["intensity"])
                if "light" in command:
                    light = command["light"]
                    r, g, b = light["rgb"]
                    brightness = int(light["intensity"] * 255)
                    device.set_led(r, g, b, brightness)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = DataFeelApp()
    window.show()
    sys.exit(app.exec())
