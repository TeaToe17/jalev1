from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification
import torch
import gdown
import os
import sys
import zipfile

import django


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Set the settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

# Setup Django
django.setup()

MODEL_FILE_ID = '1FO5ito6qnDqR1SERudfRueveSvnGHi-x'
MODEL_ZIP_PATH = "model.zip"
MODEL_DIR = "model/trained_model_2"

if not os.path.exists(MODEL_DIR):
    print("Model not found locally. Downloading from Google Drive...")

    gdown.download(f"https://drive.google.com/uc?id={MODEL_FILE_ID}", MODEL_ZIP_PATH, quiet=False)

    print("Extracting model zip...")
    with zipfile.ZipFile(MODEL_ZIP_PATH, 'r') as zip_ref:
        zip_ref.extractall("model")

    os.remove(MODEL_ZIP_PATH)
    print("Model downloaded and extracted.")

# 1. Load the tokenizer and trained model
tokenizer = DistilBertTokenizerFast.from_pretrained('distilbert-base-uncased')  # same one used in training
model = DistilBertForSequenceClassification.from_pretrained(MODEL_DIR)
# model = DistilBertForSequenceClassification.from_pretrained('./trained_model')
model.eval()  # Set model to evaluation mode

# 2. Label mapping (recreate if needed - must match what was used in training)
label2id = {
    "contact exchange": 0,
    "address exchange": 1,
    "negotiation": 2,
    "general chat": 3,
}
id2label = {v: k for k, v in label2id.items()}

# 3. Inference function
def predict(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
    logits = outputs.logits
    predicted_class_id = torch.argmax(logits, dim=1).item()
    return id2label[predicted_class_id]

print(predict("hey"))