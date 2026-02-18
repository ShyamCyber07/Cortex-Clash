from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from joblib import load
import pandas as pd
import numpy as np
import os
import uvicorn
from typing import Optional, Any

app = FastAPI(title="Cortex Clash ML Service")

# Paths
MODEL_PATH = "match_outcome_model.joblib"
SCALER_PATH = "scaler.joblib"

# Load Model
model: Optional[Any] = None
scaler: Optional[Any] = None

try:
    if os.path.exists(MODEL_PATH):
        model = load(MODEL_PATH)
        scaler = load(SCALER_PATH)
        print("Model loaded successfully.")
    else:
        print("Model not found. Please run train_model.py first.")
except Exception as e:
    print(f"Error loading model: {e}")

class MatchRequest(BaseModel):
    p1_rating: float
    p2_rating: float
    p1_win_rate: float
    p2_win_rate: float

class PredictionResponse(BaseModel):
    win_probability: float
    confidence_score: float # Distance from 0.5 decision boundary
    predicted_winner: str # 'p1' or 'p2'

@app.get("/")
def health_check():
    return {"status": "active", "model_loaded": model is not None}

@app.post("/predict", response_model=PredictionResponse)
def predict_match(data: MatchRequest):
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Use local variables to satisfy type checker
    local_model = model
    local_scaler = scaler
    
    # Feature Engineering (Must match train_model.py)
    rating_diff = data.p1_rating - data.p2_rating
    wr_diff = data.p1_win_rate - data.p2_win_rate
    
    features = pd.DataFrame([{
        'rating_diff': rating_diff,
        'wr_diff': wr_diff,
        'p1_rating': data.p1_rating,
        'p2_rating': data.p2_rating
    }])
    
    # Scale
    features_scaled = local_scaler.transform(features)
    
    # Predict Probability
    if hasattr(local_model, "classes_"):
        classes = local_model.classes_
        probs = local_model.predict_proba(features_scaled)[0]
        
        # Find index for class 1
        if 1 in classes:
            index_1 = list(classes).index(1)
            p1_win_prob = probs[index_1]
        else:
            # If only class 0 exists, prob of 1 is 0
            p1_win_prob = 0.0
    else:
        # Fallback if classes_ not available (unlikely for sklearn classifiers)
        p1_win_prob = 0.5 

    # Confidence Score (0 to 1, where 1 is absolute certainty)
    # 0.5 -> 0 confidence, 1.0 or 0.0 -> 1 confidence
    confidence = abs(p1_win_prob - 0.5) * 2
    
    predicted_winner = 'p1' if p1_win_prob > 0.5 else 'p2'
    
    return {
        "win_probability": float(p1_win_prob),
        "confidence_score": float(confidence),
        "predicted_winner": predicted_winner
    }

@app.post("/retrain")
def trigger_retrain():
    import subprocess
    try:
        # Run training in background (simplified for MVP)
        # In prod, this should use Celery or similar
        subprocess.Popen(["python", "train_model.py"])
        return {"message": "Retraining started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
