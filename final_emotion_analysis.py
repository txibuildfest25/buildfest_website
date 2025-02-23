# final_emotion_analysis.py
import os
import json
import nltk
import matplotlib.pyplot as plt
from nltk.tokenize import sent_tokenize, word_tokenize
from transformers import pipeline

# Download necessary NLTK resources
nltk.download('punkt')
nltk.download('averaged_perceptron_tagger')
nltk.download('averaged_perceptron_tagger_eng')

# ---------------------------
# DataFeel API Mappings
# ---------------------------
dot_position_mapping = {
    "right_wrist": 1,
    "right_temple": 2,
    "left_temple": 3,
    "left_wrist": 4
}

color_map = {
    "white": (255, 255, 255),
    "blue": (0, 0, 255),
    "amber": (255, 191, 0),
    "soft_yellow": (255, 255, 153),
    "light_blue": (173, 216, 230),
    "gray": (128, 128, 128),
    "indigo": (75, 0, 130)
}

vibration_waveform_map = {
    "flowing": "STRONG_BUZZ_P100",
    "deep_pulse": "TRANSITION_HUM1_P100",
    "gentle_pulse": "TRANSITION_HUM2_P100",
    "jittery": "DOUBLE_CLICK_P100",
    "steady_pulse": "STRONG_CLICK_100",
    "slow_pulse": "STRONG_CLICK_33",
    "rapid_pulse": "TRANSITION_HUM3_P100",
    "intermittent": "TRANSITION_RAMP_UP_MEDIUM_SHARP2_P0_TO_P50",
    "gentle": "TRANSITION_HUM1_P100",
    "soothing": "TRANSITION_HUM2_P50_TO_P0",
    "subtle_pulse": "TRANSITION_HUM3_P100"
}

# ---------------------------
# 1. Define Emotion Lexicons (Rule‑Based)
# ---------------------------
emotion_categories = {
    "Fear": ["fear", "afraid", "terrified", "petrified", "shivered", "trembled", "skittering", "horrified"],
    "Anxiety": ["nervous", "quickened", "pounding", "uneasy", "apprehensive", "anxious", "weight", "pressing"],
    "Sadness": ["sadness", "heartbroken", "despair", "mourning"],
    "Sorrow": ["sorrow", "cry", "tears", "grief", "pale", "lump", "lost", "vanished", "heavy"],
    "Guilt": ["guilt", "blame"],
    "Regret": ["regret", "remorse", "apologize", "failed"],
    "Awe": ["enchanted", "beauty", "magic", "awe", "majestic", "wonder", "marvel", "surged", "flared"],
    "Caution": ["caution", "looming", "lurking", "danger"],
    "Relief": ["peaceful", "calm", "soothing", "restored", "safe", "returned"],
    "Acceptance": ["relaxed", "accepted", "settled"],
    "Protection": ["shield", "protected", "defend", "guard", "firm", "grip", "secure"],
    "Concern": ["tensed", "warning", "concern"]
}

# ---------------------------
# 2. Define Multi-Word Expressions (MWEs)
# ---------------------------
mwe_expressions = {
    "Fear": ["ice skittering up her spine"],
    "Anxiety": ["heart pounding"],
    "Sadness": [],
    "Sorrow": ["face so small, so pale", "lump lodged in", "laughter had vanished"],
    "Guilt": ["it was her fault", "all her fault"],
    "Regret": [],
    "Awe": ["enchanted home", "magic surged", "flared with her emotions"],
    "Caution": ["danger lurking"],
    "Relief": ["peaceful sleep", "color returned", "kept her safe"],
    "Acceptance": [],
    "Protection": ["firm around her", "to shield her"],
    "Concern": []
}

# ---------------------------
# 3. Define Modifiers and Scoring Functions
# ---------------------------
intensifiers = {"very", "extremely", "so", "really", "highly", "incredibly", "quite", "greatly", "especially", "remarkably", "utterly", "profoundly", "terribly"}
negators = {"not", "never", "no", "n't"}

WINDOW_SIZE = 3
MWE_BASE_SCORE = 2.0

def apply_modifiers(tokens, target_index, window_size=WINDOW_SIZE):
    multiplier = 1.0
    start_index = max(0, target_index - window_size)
    for i in range(start_index, target_index):
        token = tokens[i]
        if token in intensifiers:
            multiplier *= 2.0
        elif token in negators:
            multiplier *= 0.5
    return multiplier

def score_single_words(words, lexicon):
    scores = {emotion: 0.0 for emotion in lexicon}
    for i, word in enumerate(words):
        for emotion, keywords in lexicon.items():
            if word in keywords:
                multiplier = apply_modifiers(words, i)
                scores[emotion] += multiplier
    return scores

def score_multi_word_expressions(sentence, mwe_dict):
    scores = {emotion: 0.0 for emotion in mwe_dict}
    sentence_lower = sentence.lower()
    tokens = word_tokenize(sentence_lower)
    for emotion, phrases in mwe_dict.items():
        for phrase in phrases:
            if phrase in sentence_lower:
                index = sentence_lower.find(phrase)
                preceding_text = sentence_lower[max(0, index-50):index]
                preceding_tokens = word_tokenize(preceding_text)
                multiplier = 1.0
                if preceding_tokens:
                    window_tokens = preceding_tokens[-WINDOW_SIZE:]
                    for token in window_tokens:
                        if token in intensifiers:
                            multiplier *= 2.0
                        elif token in negators:
                            multiplier *= 0.5
                scores[emotion] += MWE_BASE_SCORE * multiplier
    return scores

def merge_scores(single_scores, mwe_scores):
    merged = {}
    for emotion in single_scores:
        merged[emotion] = single_scores.get(emotion, 0.0) + mwe_scores.get(emotion, 0.0)
    return merged

def rule_based_score(sentence):
    words = word_tokenize(sentence.lower())
    single_word_scores = score_single_words(words, emotion_categories)
    mwe_scores = score_multi_word_expressions(sentence, mwe_expressions)
    return merge_scores(single_word_scores, mwe_scores)

# ---------------------------
# 4. Set Up ML Emotion Classifier
# ---------------------------
ml_classifier = pipeline("text-classification", model="j-hartmann/emotion-english-distilroberta-base", return_all_scores=True)
ml_to_rule_mapping = {
    "anger": {"Guilt": 0.6, "Regret": 0.4},
    "disgust": {"Guilt": 0.5, "Regret": 0.5},
    "fear": {"Fear": 0.6, "Anxiety": 0.4},
    "joy": {"Relief": 0.5, "Acceptance": 0.5},
    "sadness": {"Sadness": 0.4, "Sorrow": 0.6},
    "surprise": {"Awe": 1.0},
    "neutral": {}
}

def get_ml_scores(sentence):
    results = ml_classifier(sentence)[0]
    ml_scores = {emotion: 0.0 for emotion in emotion_categories}
    for result in results:
        label = result['label'].lower()
        score = result['score']
        mapping = ml_to_rule_mapping.get(label, {})
        for rule_emotion, weight in mapping.items():
            ml_scores[rule_emotion] += score * weight
    return ml_scores

# ---------------------------
# 5. Blending Function
# ---------------------------
ALPHA = 0.5
def blend_scores(rule_scores, ml_scores, alpha=ALPHA):
    blended = {}
    for emotion in set(list(rule_scores.keys()) + list(ml_scores.keys())):
        blended[emotion] = alpha * rule_scores.get(emotion, 0.0) + (1 - alpha) * ml_scores.get(emotion, 0.0)
    return blended

def final_score(sentence):
    rb_scores = rule_based_score(sentence)
    ml_scores = get_ml_scores(sentence)
    return blend_scores(rb_scores, ml_scores)

# ---------------------------
# 6. Normalization & Thresholding Function
# ---------------------------
def normalize_and_threshold(scores, threshold=0.05):
    if not scores:
        return {}
    max_val = max(scores.values())
    normalized = {k: (v / max_val if max_val else 0) for k, v in scores.items()}
    return {k: round(v, 2) for k, v in normalized.items() if v >= threshold}

# ---------------------------
# 7. Haptic Mapping and Command Generation (DataFeel API Compatible)
# ---------------------------
# Amplify emotion scores for a more immersive experience.
AMPLIFICATION_FACTOR = 1.5

def generate_haptic_command(emotion_scores, mapping, weight_threshold=0.1):
    commands = []
    for emotion, score in emotion_scores.items():
        if score >= weight_threshold and emotion in mapping:
            # Amplify the score (cap to 1.0)
            amplified_score = score * AMPLIFICATION_FACTOR
            if amplified_score > 1:
                amplified_score = 1

            raw_temp = mapping[emotion]["thermal"]["temperature"]
            # Remove lower temperature restriction; only cap upper bound at 40°C.
            clamped_temp = raw_temp if raw_temp <= 40 else 40

            # Convert light color to RGB using our color map.
            r, g, b = color_map.get(mapping[emotion]["light"]["color"], (0, 0, 0))
            # Convert vibration pattern to waveform (no prefix).
            waveform = vibration_waveform_map.get(mapping[emotion]["vibration"]["pattern"], "STRONG_BUZZ_P100")

            cmd = {
                "emotion": emotion,
                "vibration": {
                    "intensity": round(mapping[emotion]["vibration"]["intensity"] * amplified_score, 2),
                    "frequency": mapping[emotion]["vibration"]["frequency"],
                    "waveform": waveform
                },
                "thermal": {
                    "temperature": clamped_temp,
                    "intensity": round((mapping[emotion]["thermal"]["intensity"] * 2) - 1, 2)
                },
                "light": {
                    "rgb": [r, g, b],
                    "intensity": round(mapping[emotion]["light"]["intensity"] * amplified_score, 2)
                }
            }
            commands.append(cmd)
    return commands

# ---------------------------
# 7.5 Define haptic_mapping BEFORE using it
haptic_mapping = {
    "Fear": {
        "vibration": {"intensity": 0.85, "frequency": 195, "pattern": "rapid_pulse"},
        "thermal": {"temperature": 10, "intensity": 0.8},
        "light": {"color": "blue", "intensity": 0.65}
    },
    "Anxiety": {
        "vibration": {"intensity": 0.75, "frequency": 185, "pattern": "jittery"},
        "thermal": {"temperature": 10, "intensity": 0.6},
        "light": {"color": "light_blue", "intensity": 0.55}
    },
    "Sadness": {
        "vibration": {"intensity": 0.5, "frequency": 170, "pattern": "slow_pulse"},
        "thermal": {"temperature": 25, "intensity": 0.4},
        "light": {"color": "gray", "intensity": 0.45}
    },
    "Sorrow": {
        "vibration": {"intensity": 0.6, "frequency": 175, "pattern": "deep_pulse"},
        "thermal": {"temperature": 10, "intensity": 0.5},
        "light": {"color": "indigo", "intensity": 0.5}
    },
    "Guilt": {
        "vibration": {"intensity": 0.7, "frequency": 180, "pattern": "steady_pulse"},
        "thermal": {"temperature": 30, "intensity": 0.6},
        "light": {"color": "amber", "intensity": 0.55}
    },
    "Regret": {
        "vibration": {"intensity": 0.65, "frequency": 175, "pattern": "gentle_pulse"},
        "thermal": {"temperature": 20, "intensity": 0.5},
        "light": {"color": "soft_yellow", "intensity": 0.5}
    },
    "Awe": {
        "vibration": {"intensity": 0.5, "frequency": 170, "pattern": "flowing"},
        "thermal": {"temperature": 35, "intensity": 0.5},
        "light": {"color": "white", "intensity": 0.8}
    },
    "Caution": {
        "vibration": {"intensity": 0.8, "frequency": 190, "pattern": "intermittent"},
        "thermal": {"temperature": 25, "intensity": 0.7},
        "light": {"color": "red", "intensity": 0.8}
    },
    "Relief": {
        "vibration": {"intensity": 0.4, "frequency": 160, "pattern": "gentle"},
        "thermal": {"temperature": 35, "intensity": 0.7},
        "light": {"color": "green", "intensity": 0.7}
    },
    "Acceptance": {
        "vibration": {"intensity": 0.3, "frequency": 160, "pattern": "soothing"},
        "thermal": {"temperature": 25, "intensity": 0.6},
        "light": {"color": "soft_white", "intensity": 0.6}
    },
    "Protection": {
        "vibration": {"intensity": 1.0, "frequency": 200, "pattern": "steady"},
        "thermal": {"temperature": 40, "intensity": 1.0},
        "light": {"color": "orange", "intensity": 0.9}
    },
    "Concern": {
        "vibration": {"intensity": 0.4, "frequency": 160, "pattern": "subtle_pulse"},
        "thermal": {"temperature": 25, "intensity": 0.4},
        "light": {"color": "purple", "intensity": 0.4}
    }
}

# ---------------------------
# 8. Visualization – Save Emotion Timeline Plots
# ---------------------------
def save_emotion_timeline(results, file_name, plot_folder):
    all_emotions = set()
    for entry in results:
        all_emotions.update(entry.get("raw_scores", {}).keys())
    emotion_series = {emotion: [] for emotion in all_emotions}
    sentence_numbers = []
    for entry in results:
        sentence_numbers.append(entry["sentence_number"])
        for emotion in all_emotions:
            emotion_series[emotion].append(entry.get("raw_scores", {}).get(emotion, 0.0))
    plt.figure(figsize=(12,6))
    for emotion, series in emotion_series.items():
        plt.plot(sentence_numbers, series, marker='o', label=emotion)
    plt.xlabel("Sentence Number")
    plt.ylabel("Raw Blended Emotion Score")
    plt.title(f"Emotion Timeline for {file_name}")
    plt.legend()
    plt.tight_layout()
    plot_file = os.path.join(plot_folder, f"{os.path.splitext(file_name)[0]}_emotion_timeline.png")
    plt.savefig(plot_file)
    plt.close()
    print(f"Plot saved to {plot_file}")

# ---------------------------
# 9. Dot-Specific Adjustment Function
# ---------------------------
def adjust_commands_for_dot(commands, dot):
    """
    Adjust haptic command parameters based on the dot's location.
    - For temple dots (right_temple, left_temple): reduce vibration and thermal intensity.
    - For wrist dots (right_wrist, left_wrist): slightly boost vibration intensity.
    """
    adjusted = []
    for cmd in commands:
        new_cmd = cmd.copy()
        if dot in ["right_temple", "left_temple"]:
            new_cmd["vibration"]["intensity"] = round(new_cmd["vibration"]["intensity"] * 0.8, 2)
            new_cmd["thermal"]["intensity"] = round(new_cmd["thermal"]["intensity"] * 0.5, 2)
            if new_cmd["vibration"]["waveform"] == "TRANSITION_HUM3_P100":
                new_cmd["vibration"]["waveform"] = "TRANSITION_HUM2_P100"
            new_cmd["light"]["intensity"] = round(new_cmd["light"]["intensity"] * 0.9, 2)
        elif dot in ["right_wrist", "left_wrist"]:
            new_cmd["vibration"]["intensity"] = round(new_cmd["vibration"]["intensity"] * 1.1, 2)
        adjusted.append(new_cmd)
    return adjusted

# ---------------------------
# 10. Process File Functions
# ---------------------------
def process_file_filtered(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    sentences = sent_tokenize(text)
    results = []
    # Define dot positions (using keys from dot_position_mapping)
    dot_positions = ["right_wrist", "right_temple", "left_temple", "left_wrist"]
    for idx, sentence in enumerate(sentences, start=1):
        scores = final_score(sentence)
        filtered_scores = normalize_and_threshold(scores, threshold=0.05)
        if filtered_scores:
            base_commands = generate_haptic_command(filtered_scores, haptic_mapping, weight_threshold=0.1)
            dot_commands = []
            for pos in dot_positions:
                adjusted_cmds = adjust_commands_for_dot(base_commands, pos)
                dot_commands.append({
                    "address": dot_position_mapping.get(pos, 0),
                    "commands": adjusted_cmds
                })
            results.append({
                "sentence_number": idx,
                "sentence": sentence,
                "normalized_emotion_scores": filtered_scores,
                "haptic_commands": dot_commands
            })
    return results

def process_file_all(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    sentences = sent_tokenize(text)
    results = []
    for idx, sentence in enumerate(sentences, start=1):
        scores = final_score(sentence)
        results.append({
            "sentence_number": idx,
            "sentence": sentence,
            "raw_scores": scores
        })
    return results

# ---------------------------
# 11. Main Processing: Read Files and Save Outputs
# ---------------------------
input_folder = "texts"     # txibuildfest2025/texts
output_folder = "haptics"    # txibuildfest2025/haptics
plot_folder = "plots"      # txibuildfest2025/plots

for folder in [output_folder, plot_folder]:
    if not os.path.exists(folder):
        os.makedirs(folder)

for file_name in os.listdir(input_folder):
    if file_name.endswith(".txt"):
        full_input_path = os.path.join(input_folder, file_name)
        results_data = process_file_filtered(full_input_path)
        output_file = os.path.join(output_folder, f"{os.path.splitext(file_name)[0]}_haptic_output.json")
        with open(output_file, "w", encoding="utf-8") as f_out:
            json.dump(results_data, f_out, indent=4)
        print(f"Haptic output saved to {output_file}")
        
        all_results = process_file_all(full_input_path)
        save_emotion_timeline(all_results, file_name, plot_folder)
