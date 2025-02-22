import { connectToDot, sendHapticCommand } from "./ble.js";

const synth = window.speechSynthesis;
const playBtn = document.getElementById('play');
const connectBtn = document.getElementById('connectBluetooth');
const storySelect = document.getElementById('story');
const textContentElem = document.getElementById('textContent');
const paceInput = document.getElementById('pace');
const fontSizeInput = document.getElementById('fontSize');
const contrastInput = document.getElementById('contrast');
const spacingInput = document.getElementById('spacing');
const dyslexiaToggle = document.getElementById('dyslexiaMode');

let sentences = [];
let currentSentenceIndex = 0;
let hapticData = null;

// ✅ Apply user-controlled accessibility settings
function updateAccessibilitySettings() {
    document.documentElement.style.setProperty("--font-size", fontSizeInput.value + "px");
    document.documentElement.style.setProperty("--line-spacing", spacingInput.value);
    document.documentElement.style.setProperty("--contrast", contrastInput.value);
}

// ✅ Ensure settings update when user changes them
fontSizeInput.addEventListener('input', updateAccessibilitySettings);
spacingInput.addEventListener('input', updateAccessibilitySettings);
contrastInput.addEventListener('input', updateAccessibilitySettings);

// ✅ Apply Dyslexia-Friendly Font
dyslexiaToggle.addEventListener('change', () => {
    document.body.classList.toggle('dyslexia-mode', dyslexiaToggle.checked);
});

// ✅ Connect Bluetooth when user clicks "Connect to DataFeel"
connectBtn.addEventListener("click", async () => {
    let connected = await connectToDot();
    if (connected) {
        alert("Connected to DataFeel device!");
    } else {
        alert("Failed to connect. Please try again.");
    }
});

// ✅ Load text & haptics dynamically
async function loadTextAndHaptics(storyId) {
    const textResponse = await fetch(`texts/${storyId}.txt`);
    const text = await textResponse.text();
    sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
    textContentElem.innerHTML = sentences.map((s, i) => `<span id="sentence-${i}">${s}</span> `).join("");

    const jsonResponse = await fetch(`haptics/${storyId}_haptic_output.json`);
    hapticData = await jsonResponse.json();
}

storySelect.addEventListener('change', () => loadTextAndHaptics(storySelect.value));

// ✅ Narration with haptic sync
function speakSentence(sentence) {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = parseFloat(paceInput.value);  // Speech speed = reading pace

    utterance.onstart = async () => {
        const sentenceElem = document.getElementById(`sentence-${currentSentenceIndex}`);
        document.querySelectorAll("span").forEach(s => s.classList.remove("sentence-active"));
        sentenceElem.classList.add("sentence-active");

        // Get haptic command for current sentence
        const hapticCommands = hapticData.find(h => h.sentence_number === currentSentenceIndex + 1)?.haptic_commands || [];
        if (hapticCommands.length) {
            await sendHapticCommand(hapticCommands);
        }
    };

    utterance.onend = () => {
        currentSentenceIndex++;
        if (currentSentenceIndex < sentences.length) {
            setTimeout(() => speakSentence(sentences[currentSentenceIndex]), paceInput.value * 1000);
        } else {
            console.log("Narration complete.");
        }
    };

    synth.speak(utterance);
}

// ✅ Start narration when "Play" is clicked
playBtn.addEventListener('click', () => {
    if (synth.speaking) synth.cancel();
    if (sentences.length > 0) speakSentence(sentences[currentSentenceIndex]);
});
