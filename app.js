// --- Global Variables ---
const synth = window.speechSynthesis;
const playBtn = document.getElementById('play');
const rateInput = document.getElementById('rate');
const textContentElem = document.getElementById('textContent');
const storySelect = document.getElementById('story');
const dyslexiaToggle = document.getElementById('dyslexiaToggle');

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

// --- Send Haptic Feedback ---
async function sendHapticCommand(sentenceIndex) {
    if (!hapticData) return;
    const hapticCommands = hapticData.find(h => h.sentence_number === sentenceIndex + 1)?.haptic_commands || [];

    if (window.pyodide && hapticCommands.length) {
        await window.pyodide.runPythonAsync(`send_haptic_for_sentence(${JSON.stringify(hapticCommands)})`);
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
    if (dyslexiaToggle.checked) {
        textContentElem.classList.add("dyslexie");
    } else {
        textContentElem.classList.remove("dyslexie");
    }
});
