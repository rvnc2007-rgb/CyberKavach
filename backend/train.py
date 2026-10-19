# backend/train.py
import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score

DATA_PATH = "data/processed/unified_dataset.csv"
MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "ml_model.joblib")

def train():
    os.makedirs(MODEL_DIR, exist_ok=True)

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Run prepare_data.py first! Could not find {DATA_PATH}")

    print("=" * 60)
    print("LOADING FULL UNIFIED DATASET FOR TRAINING...")
    print("=" * 60)
    
    # keep_default_na=False prevents pandas from converting blanks/NAs to float np.nan
    df = pd.read_csv(DATA_PATH, keep_default_na=False, low_memory=False)

    # Sanitize and strip non-string / blank values
    df = df.dropna(subset=['text', 'label'])
    df['text'] = df['text'].astype(str).str.strip()
    df = df[df['text'] != '']
    df['label'] = pd.to_numeric(df['label'], errors='coerce').fillna(0).astype(int)

    print(f"Total clean training samples: {len(df):,}")

    X = df['text']
    y = df['label']

    print("Splitting train/test sets (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=40000,
            ngram_range=(1, 2),
            sublinear_tf=True,
            token_pattern=r'(?u)\b\w+\b|\+[0-9]+|https?://[^\s]+'
        )),
        ('clf', SGDClassifier(
            loss='log_loss',
            penalty='l2',
            alpha=1e-5,
            max_iter=1000,
            tol=1e-3,
            class_weight='balanced',
            random_state=42
        ))
    ])

    print("\nTraining model across all samples...")
    pipeline.fit(X_train, y_train)

    print("\nEvaluating model on test set...")
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Model Accuracy: {acc * 100:.2f}%\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["SAFE (0)", "SPAM/SCAM (1)"]))

    joblib.dump(pipeline, MODEL_PATH)
    print(f"\nModel exported successfully to: {MODEL_PATH}")

if __name__ == '__main__':
    train()