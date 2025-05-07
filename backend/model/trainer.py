import pandas as pd
from sklearn.model_selection import train_test_split
from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification, Trainer, TrainingArguments
from datasets import Dataset

def train_model():
    # 1. Load the CSV file
    df = pd.read_csv('uncaught.csv')  # Make sure this file exists in your working directory

    # 2. Split data into training and validation sets
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        df['text'], df['label'], test_size=0.2, stratify=df['label'], random_state=42
    )

    # 3. Encode texts using DistilBERT tokenizer
    tokenizer = DistilBertTokenizerFast.from_pretrained('distilbert-base-uncased')
    train_encodings = tokenizer(list(train_texts), truncation=True, padding=True)
    val_encodings = tokenizer(list(val_texts), truncation=True, padding=True)

    # 4. Label mapping
    label2id = {label: i for i, label in enumerate(sorted(set(df['label'])))}
    train_labels = [label2id[label] for label in train_labels]
    val_labels = [label2id[label] for label in val_labels]

    # 5. Create the Dataset objects
    train_dataset = Dataset.from_dict({**train_encodings, "label": train_labels})
    val_dataset = Dataset.from_dict({**val_encodings, "label": val_labels})

    # 6. Initialize DistilBERT model for sequence classification
    model = DistilBertForSequenceClassification.from_pretrained(
        "distilbert-base-uncased", num_labels=len(label2id)
    )

    # 7. Set up training arguments
    training_args = TrainingArguments(
        output_dir="./results_2",  # Save the results in this directory
        eval_strategy="epoch",  # Evaluate every epoch
        # evaluation_strategy="epoch",  # Evaluate every epoch
        per_device_train_batch_size=16,
        per_device_eval_batch_size=16,
        num_train_epochs=4,
        weight_decay=0.01,
    )

    # 8. Set up Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
    )

    # 9. Train the model
    trainer.train()

    # 10. Save the trained model
    # model.save_pretrained('./trained_model_2')  # Save model in the 'trained_model' directory
    model.save_pretrained('trained_model_2')  # Save model in the 'trained_model' directory

    print("Model saved to ./trained_model_2")

# Run the training function
train_model()
