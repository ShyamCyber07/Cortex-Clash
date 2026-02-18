import pandas as pd
import numpy as np
import os
from pymongo import MongoClient
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from joblib import dump, load
from datetime import datetime, timedelta
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/cortex_clash")
MODEL_PATH = "match_outcome_model.joblib"
SCALER_PATH = "scaler.joblib"

def get_db_connection():
    client = MongoClient(MONGO_URI)
    return client.cortex_clash

def fetch_data():
    try:
        db = get_db_connection()
        # Set a short timeout for server selection
        with  MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000) as client:
            db = client.cortex_clash
            # Fetch completed matches
            matches = list(db.matches.find({"status": "completed"}))
            logger.info(f"Fetched {len(matches)} matches from DB")
            return matches
    except Exception as e:
        logger.error(f"DB Connection failed: {e}. Using dummy data.")
        return []

def get_user_stats(user_id, matches_before_date, all_matches):
    """
    Calculate stats for a user BEFORE a specific match date to avoid leakage.
    For MVP, we might just take current stats if historical reconstruction is too heavy,
    but let's try a simple historical lookback.
    """
    # Filter matches where user participated and match ended before current match
    relevant_matches = [
        m for m in all_matches 
        if (str(user_id) in [str(p) for p in m['participants']]) and m['endTime'] < matches_before_date
    ]
    
    wins = 0
    total = len(relevant_matches)
    
    if total == 0:
        return 1000, 0.5, 0 # Default Rating, WinRate, Trend
        
    # Mocking historical rating reconstruction (Ideally we'd use eloHistory from User model)
    # For this script, we will pull the User's CURRENT rating from the DB separately 
    # to be faster, but this introduces look-ahead bias for old matches.
    # TODO: Use proper point-in-time rating. For now, we use a heuristic.
    
    for m in relevant_matches:
        if str(m.get('winner')) == str(user_id):
            wins += 1
            
    win_rate = wins / total
    
    # Recent trend (last 5 matches)
    recent = relevant_matches[-5:]
    recent_wins = sum(1 for m in recent if str(m.get('winner')) == str(user_id))
    recent_trend = recent_wins / len(recent) if recent else 0.5
    
    return 1000, win_rate, recent_trend # Rating is mocked as 1000 in this simplified fetch

def prepare_dataset(matches):
    data = []
    
    # Pre-fetch all users to get current ratings (Bias warning: using current rating for past matches)
    # In production, we should log rating snapshots with matches.
    db = get_db_connection()
    users = {str(u['_id']): u for u in db.users.find()}
    
    for match in matches:
        if len(match['participants']) != 2:
            continue # Skip non-1v1 for now
            
        p1_id = str(match['participants'][0])
        p2_id = str(match['participants'][1])
        winner_id = str(match.get('winner'))
        
        if p1_id not in users or p2_id not in users:
            continue
            
        p1 = users[p1_id]
        p2 = users[p2_id]
        
        # Features
        # 1. Rating Diff
        p1_rating = p1.get('stats', {}).get('rankPoints', 1000)
        p2_rating = p2.get('stats', {}).get('rankPoints', 1000)
        rating_diff = p1_rating - p2_rating
        
        # 2. Win Rate Diff
        p1_wr = p1.get('stats', {}).get('wins', 0) / max(1, p1.get('stats', {}).get('matchesPlayed', 1))
        p2_wr = p2.get('stats', {}).get('wins', 0) / max(1, p2.get('stats', {}).get('matchesPlayed', 1))
        wr_diff = p1_wr - p2_wr
        
        # Target: 1 if P1 wins, 0 if P2 wins
        target = 1 if winner_id == p1_id else 0
        
        data.append({
            'rating_diff': rating_diff,
            'wr_diff': wr_diff,
            'p1_rating': p1_rating,
            'p2_rating': p2_rating,
            'target': target
        })
        
        # Augment data by flipping (P2 vs P1) to balance dataset
        data.append({
            'rating_diff': -rating_diff,
            'wr_diff': -wr_diff,
            'p1_rating': p2_rating,
            'p2_rating': p1_rating,
            'target': 1 - target
        })
        
    return pd.DataFrame(data)

def train():
    logger.info("Starting training pipeline...")
    matches = fetch_data()
    
    if not matches:
        logger.warning("No matches found in DB. Creating dummy model.")
        # Create dummy data to ensure model file exists
        df = pd.DataFrame([
            {'rating_diff': 100, 'wr_diff': 0.1, 'p1_rating': 1100, 'p2_rating': 1000, 'target': 1},
            {'rating_diff': -100, 'wr_diff': -0.1, 'p1_rating': 1000, 'p2_rating': 1100, 'target': 0}
        ])
    else:
        df = prepare_dataset(matches)
        
    if df.empty:
        logger.warning("Dataset empty after processing. Aborting.")
        return

    X = df[['rating_diff', 'wr_diff', 'p1_rating', 'p2_rating']]
    y = df['target']
    
    # Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Model (Random Forest)
    clf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    clf.fit(X_train_scaled, y_train)
    
    # Evaluate
    score = clf.score(X_test_scaled, y_test)
    logger.info(f"Model Accuracy: {score:.2f}")
    
    # Save artifacts
    dump(clf, MODEL_PATH)
    dump(scaler, SCALER_PATH)
    logger.info(f"Model saved to {MODEL_PATH}")

if __name__ == "__main__":
    train()
