const synth = window.speechSynthesis;
const playBtn = document.getElementById('play');
const storySelect = document.getElementById('story');
const textContentElem = document.getElementById('textContent');
const paceInput = document.getElementById('pace');
const dyslexiaToggle = document.getElementById('dyslexiaMode');

let sentences = [];
let currentSentenceIndex = 0;
let hapticData = null;

// Emotion-to-Color Mapping
const emotionColors = {
    "Fear": "#4B0082",
    "Anxiety": "#B22222",
    "Sadness": "#4682B4",
    "Sorrow": "#8B0000",
    "Guilt": "#A52A2A",
    "Regret": "#FF8C00",
    "Awe": "#32CD32"
};

// Apply Dyslexia-Friendly Font
dyslexiaToggle.addEventListener('change', () => {
    document.body.classList.toggle('dyslexia-mode', dyslexiaToggle.checked);
});

// Load Text & Haptics
async function loadTextAndHaptics(storyId) {
    const textResponse = await fetch(`texts/${storyId}.txt`);
    const text = await textResponse.text();
    sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
    textContentElem.innerHTML = sentences.map((s, i) => `<span id="sentence-${i}">${s}</span> `).join("");

    const jsonResponse = await fetch(`haptics/${storyId}_haptic_output.json`);
    hapticData = await jsonResponse.json();
}

storySelect.addEventListener('change', () => loadTextAndHaptics(storySelect.value));

// Initialize Pyodide
async function initPyodide() {
    window.pyodide = await loadPyodide();
    const response = await fetch("send_haptics.py");
    const code = await response.text();
    window.pyodide.runPython(code);
}
initPyodide();

// Narration with Haptic Sync
function speakSentence(sentence) {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = parseFloat(paceInput.value);
    
    utterance.onstart = async () => {
        const sentenceElem = document.getElementById(`sentence-${currentSentenceIndex}`);
        document.querySelectorAll("span").forEach(s => s.classList.remove("sentence-active"));
        sentenceElem.classList.add("sentence-active");

        const hapticCommands = hapticData.find(h => h.sentence_number === currentSentenceIndex + 1)?.haptic_commands || [];
        if (hapticCommands.length && window.pyodide) {
            await window.pyodide.runPythonAsync(`send_haptic_for_sentence(${JSON.stringify(hapticCommands)})`);
        }

        // Background color changes based on dominant emotion
        const dominantEmotion = Object.keys(emotionColors).find(e => hapticData[0]?.normalized_emotion_scores[e]);
        document.body.style.backgroundColor = emotionColors[dominantEmotion] || "#f8f8f8";
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

playBtn.addEventListener('click', () => {
    if (synth.speaking) synth.cancel();
    if (sentences.length > 0) speakSentence(sentences[currentSentenceIndex]);
});
