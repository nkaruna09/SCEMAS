from fastapi import FastAPI, Depends, HTTPException, status 
from supabase import create_client, Client
from pydantic import BaseModel
from typing import Optional 
import os 
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Run the app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)