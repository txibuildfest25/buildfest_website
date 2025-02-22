// --- Global Variables ---
const synth = window.speechSynthesis;
const playBtn = document.getElementById('play');
const rateInput = document.getElementById('rate');
const textContentElem = document.getElementById('textContent');
const storySelect = document.getElementById('story');
const dyslexiaToggle = document.getElementById('dyslexiaToggle');
const fontSizeInput = document.getElementById('fontSize');
const contrastInput = document.getElementById('contrast');
const spacingInput = document.getElementById('spacing');
const bookTextContainer = document.getElementById('book-text');

let sentences = [];
let currentSentenceIndex = 0;
let hapticData = null;

// --- Load Text & Haptic Data ---
async function loadTextAndHaptics(storyId) {
    const textResponse = await fetch(`texts/${storyId}.txt`);
    const text = await textResponse.text();
    textContentElem.innerText = text;
    sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
    currentSentenceIndex = 0;

    const jsonResponse = await fetch(`haptics/${storyId}_haptic_output.json`);
    hapticData = await jsonResponse.json();
}

storySelect.addEventListener('change', () => loadTextAndHaptics(storySelect.value));

// --- Emotion to Sentifiction Color Mapping ---
const emotionColors = {
    "Awe": "#DFFFD6",
    "Fear": "#B22222",
    "Sadness": "#708090",
    "Sorrow": "#800080",
    "Guilt": "#8B4513",
    "Regret": "#D2691E",
    "Anxiety": "#FFD700"
};

// --- Set Background Color Based on Emotion ---
function setBackgroundColor(sentenceIndex) {
    if (!hapticData) return;
    
    const sentenceData = hapticData.find(h => h.sentence_number === sentenceIndex + 1);
    if (!sentenceData || !sentenceData.normalized_emotion_scores) return;

    // Find dominant emotion
    let maxEmotion = null;
    let maxScore = 0;
    for (const [emotion, score] of Object.entries(sentenceData.normalized_emotion_scores)) {
        if (score > maxScore) {
            maxEmotion = emotion;
            maxScore = score;
        }
    }

    // Apply background color based on dominant emotion
    if (maxEmotion && emotionColors[maxEmotion]) {
        document.getElementById("book-text").style.backgroundColor = emotionColors[maxEmotion];
    }
}

// --- Send Haptic Feedback to DataFeel Dots ---
async function sendHapticCommand(sentenceIndex) {
    if (!hapticData) return;
    const hapticCommands = hapticData.find(h => h.sentence_number === sentenceIndex + 1)?.haptic_commands || [];

    if (window.pyodide && hapticCommands.length) {
        await window.pyodide.runPythonAsync(`
import json
from js import hapticCommands
def send_haptic_for_sentence(commands_json):
    commands = json.loads(commands_json)
    print("Sending Haptic Data:", commands)
send_haptic_for_sentence(hapticCommands)
        `, { hapticCommands: JSON.stringify(hapticCommands) });
    }
}

// --- TTS with Haptic Sync ---
function speakSentence(sentence) {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = parseFloat(rateInput.value);

    utterance.onstart = async () => {
        setBackgroundColor(currentSentenceIndex); // Change background color
        await sendHapticCommand(currentSentenceIndex); // Send haptic feedback
    };

    utterance.onend = () => {
        currentSentenceIndex++;
        if (currentSentenceIndex < sentences.length) {
            speakSentence(sentences[currentSentenceIndex]);
        }
    };

    synth.speak(utterance);
}

// --- Play Button Event ---
playBtn.addEventListener('click', () => {
    if (synth.speaking) synth.cancel();
    if (sentences.length > 0) speakSentence(sentences[currentSentenceIndex]);
});

// --- Dyslexia Font Toggle ---
dyslexiaToggle.addEventListener('change', () => {
    document.body.classList.toggle("dyslexie", dyslexiaToggle.checked);
});

// --- Accessibility Adjustments ---
function updateAccessibility() {
    const fontSize = fontSizeInput.value + "px";
    const lineSpacing = spacingInput.value;
    document.documentElement.style.setProperty("--font-size", fontSize);
    document.documentElement.style.setProperty("--line-spacing", lineSpacing);
    if (parseFloat(contrastInput.value) > 1) {
        document.documentElement.style.setProperty("--bg-color", "#fff");
        document.documentElement.style.setProperty("--text-color", "#000");
    } else {
        document.documentElement.style.setProperty("--bg-color", "#f8f8f8");
        document.documentElement.style.setProperty("--text-color", "#333");
    }
}
fontSizeInput.addEventListener('input', updateAccessibility);
spacingInput.addEventListener('input', updateAccessibility);
contrastInput.addEventListener('input', updateAccessibility);
