import os
import django
# import re


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()


from transformers import pipeline #noqa E402

# # classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
classifier = pipeline("zero-shot-classification", model="roberta-large-mnli")


# # Define your labels
labels = ["contact exchange", "address exchange", "negotiation", "general chat"]
# labels = ["connect or call or meet", "other"]

# Function to classify messages
def classify_message(message):
    # Use the classifier to predict the label for the message
    result = classifier(message, candidate_labels=labels)
    return result

messages =[
    "its time",
    "check",
    "check the price",
    "hello, i need this book",
    "Mariere B104",
    "Mariere",
    "B1o4",
    "zeroeightzerotwoeighttwoseven",
    "0.8.0.2.8.2.7"
] 

# Classify each message
classified_messages = [(msg, classify_message(msg)) for msg in messages]

# Output the classification results
for msg, classification in classified_messages:
    print(f"Message: {msg}")
    print(f"Classification: {classification['labels'][0]} (confidence: {classification['scores'][0]:.4f})\n")