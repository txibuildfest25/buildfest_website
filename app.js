// --- Global Variables ---
const synth = window.speechSynthesis;
const playBtn = document.getElementById('play');
const rateInput = document.getElementById('rate');
const pitchInput = document.getElementById('pitch');
const volumeInput = document.getElementById('volume');
const textContentElem = document.getElementById('textContent');
const storySelect = document.getElementById('story');
const paceInput = document.getElementById('pace');

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

// --- Pyodide Initialization ---
async function initPyodide() {
  window.pyodide = await loadPyodide();
  const response = await fetch("send_haptics.py");
  const code = await response.text();
  window.pyodide.runPython(code);
}
initPyodide();

// --- TTS with Haptic Sync ---
function speakSentence(sentence) {
  const utterance = new SpeechSynthesisUtterance(sentence);
  utterance.rate = parseFloat(rateInput.value);
  utterance.pitch = parseFloat(pitchInput.value);
  utterance.volume = parseFloat(volumeInput.value);

  utterance.onstart = async () => {
    console.log(`Speaking: ${sentence}`);

    const hapticCommands = hapticData.find(h => h.sentence_number === currentSentenceIndex + 1)?.haptic_commands || [];

    if (window.pyodide && hapticCommands.length) {
      await window.pyodide.runPythonAsync(`send_haptic_for_sentence(${JSON.stringify(hapticCommands)})`);
    }
  };

  utterance.onend = () => {
    currentSentenceIndex++;
    if (currentSentenceIndex < sentences.length) {
      setTimeout(() => speakSentence(sentences[currentSentenceIndex]), parseFloat(paceInput.value) * 1000);
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
