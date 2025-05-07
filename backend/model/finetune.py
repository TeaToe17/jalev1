import os
import django
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# print(os.path.dirname(__file__))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from datasets import load_dataset #noqa E402

from transformers import RobertaTokenizer, RobertaForSequenceClassification, Trainer, TrainingArguments #noqa E402

if __name__ == "__main__":
    import multiprocessing #noqa
    multiprocessing.set_start_method("spawn", force=True)
    # import torch

    # Label mappings
    label2id = {
        "contact exchange": 0,
        "address exchange": 1,
        "negotiation": 2,
        "general chat": 3,
    }
    id2label = {v: k for k, v in label2id.items()}

    # Load dataset
    dataset = load_dataset("csv", data_files="model/messages.csv")

    # Encode labels
    def encode_labels(example):
        example["label"] = label2id[example["label"]]
        return example

    dataset = dataset.map(encode_labels)

    # Load tokenizer for roberta-large-mnli
    tokenizer = RobertaTokenizer.from_pretrained("roberta-large")

    # Tokenize messages
    def tokenize_function(example):
        return tokenizer(example["text"], padding="max_length", truncation=True)

    tokenized_datasets = dataset.map(tokenize_function, batched=True)

    # Load model
    model = RobertaForSequenceClassification.from_pretrained(
        "roberta-large",
        num_labels=4,
        id2label=id2label,
        label2id=label2id,
    )

    # Training arguments
    training_args = TrainingArguments(
        output_dir="./results",
        # evaluation_strategy="epoch",
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=2e-5,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        num_train_epochs=3,
        weight_decay=0.01,
        load_best_model_at_end=True,
        logging_dir="./logs",
        dataloader_pin_memory=False,  # Important on Windows
    )

    # Trainer setup
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets["train"],
        eval_dataset=tokenized_datasets["train"],  # Replace with val split if available
        tokenizer=tokenizer,
    )

    # Train the model
    trainer.train()

    # Save the fine-tuned model
    model_path = "./my-roberta-mnli-finetuned"
    trainer.save_model(model_path)