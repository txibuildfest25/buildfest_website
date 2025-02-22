import { connectToDot, sendHapticCommand } from "./ble.js";

const synth = window.speechSynthesis;
const playBtn = document.getElementById('play');
const connectBtn = document.getElementById('connectBluetooth'); // New button
const storySelect = document.getElementById('story');
const textContentElem = document.getElementById('textContent');
const paceInput = document.getElementById('pace');

let sentences = [];
let currentSentenceIndex = 0;
let hapticData = null;

// ✅ User must click the "Connect" button before Web Bluetooth is allowed
connectBtn.addEventListener("click", async () => {
    let connected = await connectToDot();
    if (connected) {
        alert("Connected to DataFeel device!");
    } else {
        alert("Failed to connect. Please try again.");
    }
});

// Load text & corresponding haptic JSON
async function loadTextAndHaptics(storyId) {
    const textResponse = await fetch(`texts/${storyId}.txt`);
    const text = await textResponse.text();
    sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
    textContentElem.innerHTML = sentences.map((s, i) => `<span id="sentence-${i}">${s}</span> `).join("");

    const jsonResponse = await fetch(`haptics/${storyId}_haptic_output.json`);
    hapticData = await jsonResponse.json();
}

storySelect.addEventListener('change', () => loadTextAndHaptics(storySelect.value));

// Narration with Haptic Sync
function speakSentence(sentence) {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = parseFloat(paceInput.value);

    utterance.onstart = async () => {
        const sentenceElem = document.getElementById(`sentence-${currentSentenceIndex}`);
        document.querySelectorAll("span").forEach(s => s.classList.remove("sentence-active"));
        sentenceElem.classList.add("sentence-active");

        // Get matching haptic command for sentence
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

playBtn.addEventListener('click', () => {
    if (synth.speaking) synth.cancel();
    if (sentences.length > 0) speakSentence(sentences[currentSentenceIndex]);
});
