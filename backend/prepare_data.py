# backend/prepare_data.py
import os
import glob
import json
import pandas as pd

RAW_DIR = "data/raw"
PROCESSED_DIR = "data/processed"
OUTPUT_FILE = os.path.join(PROCESSED_DIR, "unified_dataset.csv")

def normalize_label(val):
    s = str(val).strip().lower()
    if s in ['1', '1.0', 'spam', 'scam', 'fraud', 'phishing', 'bad', 'malicious', 'true']:
        return 1
    return 0

def find_columns(df):
    text_candidates = ['text', 'message', 'description', 'content', 'sms', 'url', 'body', 'tweet', 'email']
    label_candidates = ['label', 'target', 'class', 'category', 'type', 'is_scam', 'status']
    
    text_col = next((c for c in df.columns if c.lower() in text_candidates), df.columns[0])
    label_col = next((c for c in df.columns if c.lower() in label_candidates), df.columns[-1])
    return text_col, label_col

def prepare_all_data():
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    dfs = []

    print("=" * 60)
    print("CYBERKAVACH: PREPARING 100% OF ALL DATASETS")
    print("=" * 60)

    # 1. High-priority Indian Telecom & Direct Cyber Rules
    custom_rules = pd.DataFrame({
        'text': [
            # High-risk scam prefixes & spoofed IDs
            '+92 300 1234567', '+855 96 123456', '+856 20 123456', '+234 80 123456',
            '1401234567', '111-11-1111', '0000000000', '1234567890',
            # Genuine Indian numbers & official headers
            '+91 9848022338', '9823012345', '9440112233', '1600123456',
            # Everyday conversational texts (Ham)
            'Mom, reached college safely. Will call later.',
            'Your OTP for Swiggy order is 581902. Valid for 10 minutes.',
            'Rs. 450 debited from A/C XX1234 via UPI on 18-Oct-2026.',
            'Are you available for the team meeting at 4 PM?'
        ],
        'label': [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]
    })
    dfs.append(custom_rules)

    # 2. Ingest Indian Scam CSV (100% of rows)
    indian_csvs = glob.glob(os.path.join(RAW_DIR, "*Indian_Online_Scam*.csv"))
    for path in indian_csvs:
        print(f"Reading full Indian Scam CSV: {path}")
        df = pd.read_csv(path)
        t_col, l_col = find_columns(df)
        cleaned = pd.DataFrame({
            'text': df[t_col].astype(str),
            'label': df[l_col].apply(normalize_label)
        })
        dfs.append(cleaned)
        print(f"  -> Ingested {len(cleaned):,} samples from {os.path.basename(path)}")

    # 3. Ingest Indian Scam JSON (100% of records)
    indian_jsons = glob.glob(os.path.join(RAW_DIR, "*Indian_Online_Scam*.json"))
    for path in indian_jsons:
        print(f"Reading full Indian Scam JSON: {path}")
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            df = pd.DataFrame(data) if isinstance(data, list) else pd.DataFrame([data])
            t_col, l_col = find_columns(df)
            cleaned = pd.DataFrame({
                'text': df[t_col].astype(str),
                'label': df[l_col].apply(normalize_label)
            })
            dfs.append(cleaned)
            print(f"  -> Ingested {len(cleaned):,} samples from {os.path.basename(path)}")
        except Exception as e:
            print(f"  -> Note: could not parse JSON: {e}")

    # 4. Ingest 100% of final_dataset.csv (361 MB in streaming chunks)
    final_csv = os.path.join(RAW_DIR, "final_dataset.csv")
    if os.path.exists(final_csv):
        print(f"Reading 100% of final_dataset.csv (361 MB) in chunks...")
        chunk_count = 0
        total_rows = 0
        # 50,000 rows per chunk keeps memory footprint under 300MB
        for chunk in pd.read_csv(final_csv, chunksize=50000, low_memory=False):
            t_col, l_col = find_columns(chunk)
            sub = pd.DataFrame({
                'text': chunk[t_col].astype(str),
                'label': chunk[l_col].apply(normalize_label)
            })
            dfs.append(sub)
            chunk_count += 1
            total_rows += len(sub)
            if chunk_count % 5 == 0:
                print(f"  ...processed {total_rows:,} rows so far")
        print(f"  -> Ingested all {total_rows:,} rows from final_dataset.csv")

    # 5. Merge, Clean, and Deduplicate
    print("Concatenating all datasets...")
    full_df = pd.concat(dfs, ignore_index=True)
    full_df = full_df.dropna().drop_duplicates(subset=['text'])
    full_df = full_df[full_df['text'].str.strip() != '']

    full_df.to_csv(OUTPUT_FILE, index=False)
    print("\n" + "=" * 60)
    print(f"SUCCESS! Unified dataset saved at: {OUTPUT_FILE}")
    print(f"Total Unique Samples: {len(full_df):,}")
    print("Class Balance:")
    print(full_df['label'].value_counts())
    print("=" * 60)

if __name__ == '__main__':
    prepare_all_data()