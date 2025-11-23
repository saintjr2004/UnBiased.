"""
This is the main file from which the frontend calls upon to
analyze text for bias.

@author Jude Rorie
@date 11/16/2025

"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from analyze_bias import analyzeBias

# Create fastAPI instance
app = FastAPI()

# Create CORS middleware permissions
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_methods=["*"],
	allow_headers=["*"],
)

# Validate user data
class AnalyzeRequest(BaseModel):
	paragraphs: List[str]

# Expose Render stuff   
@app.get("/")
async def root():

	return {"status": "OK", "message": "FastAPI is running on Render"}

"""
Call the bias analysis function from the fetched paragraphs

@param {object[]} paragraphs - List of paragraph string objects
@returns {object[]} - Array containing the text index, the text itself,
the label put onto it, the reasoning for the label, and any sources that
may be needed for context

"""
@app.post("/api/analyze-bias")
async def analyzeBiasEndpoint(req: AnalyzeRequest):
	return analyzeBias(req.paragraphs)


