// app.js

// Element references
const synth = window.speechSynthesis;
const playBtn = document.getElementById('play');
const storySelect = document.getElementById('story');
const textContentElem = document.getElementById('textContent');
const paceInput = document.getElementById('pace');
const dyslexiaToggle = document.getElementById('dyslexiaMode');
const fontSizeInput = document.getElementById('fontSize');
const contrastInput = document.getElementById('contrast');
const spacingInput = document.getElementById('spacing');

let sentences = [];
let currentSentenceIndex = 0;

// Accessibility adjustments
function updateAccessibility() {
  const fontSize = fontSizeInput.value + "px";
  const lineSpacing = spacingInput.value;
  document.documentElement.style.setProperty("--font-size", fontSize);
  document.documentElement.style.setProperty("--line-spacing", lineSpacing);
}
fontSizeInput.addEventListener('input', updateAccessibility);
spacingInput.addEventListener('input', updateAccessibility);
contrastInput.addEventListener('input', updateAccessibility);

dyslexiaToggle.addEventListener('change', () => {
  document.body.classList.toggle('dyslexia-mode', dyslexiaToggle.checked);
});

// Load text file from 'texts' folder
async function loadText(storyId) {
  const response = await fetch(`texts/${storyId}.txt`);
  const text = await response.text();
  textContentElem.innerText = text;
  sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
  currentSentenceIndex = 0;
  synth.cancel(); // Stop any ongoing speech
}

// Pyodide initialization and module loading
async function initPyodideAndLoadModule() {
  window.pyodide = await loadPyodide();
  console.log("Pyodide loaded");
  const response = await fetch("send_haptics.py");
  const code = await response.text();
  window.pyodide.runPython(code);
  // Import functions from the module
  await window.pyodide.runPythonAsync("from send_haptics import send_haptic_for_sentence, set_story");
  window.pyodideLoaded = true;
  console.log("send_haptics module loaded");
}
initPyodideAndLoadModule();

// Story selection handler: load text and set haptic data via Python.
async function selectStory() {
  const storyId = storySelect.value;
  await loadText(storyId);
  if (window.pyodideLoaded) {
    await window.pyodide.runPythonAsync(`set_story("${storyId}")`);
  }
  currentSentenceIndex = 0;
}
storySelect.addEventListener('change', selectStory);

// TTS with haptic sync: when a sentence is spoken, call the Python function.
function speakSentence(sentence) {
  const utterance = new SpeechSynthesisUtterance(sentence);
  utterance.rate = parseFloat(paceInput.value); // You can customize as needed
  utterance.onstart = () => {
    console.log(`Starting sentence ${currentSentenceIndex + 1}`);
    if (window.pyodideLoaded) {
      const pace = parseFloat(paceInput.value);
      window.pyodide.runPythonAsync(`send_haptic_for_sentence(${currentSentenceIndex}, ${pace})`)
        .then(() => console.log("Haptic command sent."))
        .catch(err => console.error("Error sending haptic command:", err));
    }
    // Optionally, highlight current sentence without interfering with background.
    document.querySelectorAll("#book-text span").forEach(s => s.classList.remove("sentence-active"));
    const sentenceElem = document.getElementById(`sentence-${currentSentenceIndex}`);
    if (sentenceElem) {
      sentenceElem.classList.add("sentence-active");
    }
  };
  utterance.onend = () => {
    currentSentenceIndex++;
    if (currentSentenceIndex < sentences.length) {
      setTimeout(() => speakSentence(sentences[currentSentenceIndex]), parseFloat(paceInput.value) * 1000);
    } else {
      currentSentenceIndex = 0;
      console.log("Narration complete.");
    }
  };
  synth.speak(utterance);
}

playBtn.addEventListener('click', () => {
  if (synth.speaking) {
    synth.cancel();
    currentSentenceIndex = 0;
  }
  if (sentences.length > 0) {
    speakSentence(sentences[currentSentenceIndex]);
  }
});

// On page load, load the default story.
selectStory();
