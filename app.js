import { connectToSerial, sendHapticCommand } from "./serial.js";

const synth = window.speechSynthesis;
const playBtn = document.getElementById('play');
const connectBtn = document.getElementById('connectUSB');
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

// ✅ Update Accessibility Settings (Manually Adjusted)
function updateAccessibilitySettings() {
    document.documentElement.style.setProperty("--font-size", fontSizeInput.value + "px");
    document.documentElement.style.setProperty("--line-spacing", spacingInput.value);

    let contrastValue = parseFloat(contrastInput.value);
    if (contrastValue > 1.5) {
        document.documentElement.style.setProperty("--bg-color", "#000");
        document.documentElement.style.setProperty("--text-color", "#fff");
    } else if (contrastValue > 1.2) {
        document.documentElement.style.setProperty("--bg-color", "#444");
        document.documentElement.style.setProperty("--text-color", "#fff");
    } else {
        document.documentElement.style.setProperty("--bg-color", "#fff");
        document.documentElement.style.setProperty("--text-color", "#000");
    }
}

fontSizeInput.addEventListener('input', updateAccessibilitySettings);
spacingInput.addEventListener('input', updateAccessibilitySettings);
contrastInput.addEventListener('input', updateAccessibilitySettings);

// ✅ Toggle Dyslexia-Friendly Font
dyslexiaToggle.addEventListener('change', () => {
    document.body.classList.toggle('dyslexia-mode', dyslexiaToggle.checked);
});

// ✅ Connect to DataFeel via USB Serial when button is clicked
connectBtn.addEventListener("click", async () => {
    let connected = await connectToSerial();
    if (!connected) {
        alert("Failed to connect. Please try again.");
    }
});

// ✅ Load text & haptic JSON for the selected story
async function loadTextAndHaptics(storyId) {
    const textResponse = await fetch(`texts/${storyId}.txt`);
    const text = await textResponse.text();
    sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
    textContentElem.innerHTML = sentences.map((s, i) => `<span id="sentence-${i}">${s}</span> `).join("");

    const jsonResponse = await fetch(`haptics/${storyId}_haptic_output.json`);
    hapticData = await jsonResponse.json();
}

storySelect.addEventListener('change', () => loadTextAndHaptics(storySelect.value));

// ✅ Narration with Haptic Sync via USB
function speakSentence(sentence) {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = parseFloat(paceInput.value);
    utterance.pitch = parseFloat(document.getElementById('pitch').value);
    utterance.volume = parseFloat(document.getElementById('volume').value);

    utterance.onstart = async () => {
        const sentenceElem = document.getElementById(`sentence-${currentSentenceIndex}`);
        document.querySelectorAll("span").forEach(s => s.classList.remove("sentence-active"));
        sentenceElem.classList.add("sentence-active");

        // ✅ Get the correct haptic commands for this sentence
        const hapticCommands = hapticData.find(h => h.sentence_number === currentSentenceIndex + 1)?.haptic_commands || [];

        if (hapticCommands.length) {
            console.log(`Sending haptic feedback for sentence ${currentSentenceIndex + 1}`);
            await sendHapticCommand(hapticCommands);  // ✅ Sends over USB
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
