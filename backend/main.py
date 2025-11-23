"""
This is the main file from which the frontend calls upon to
analyze text for bias.

@author Jude Rorie
@date 11/16/2025

"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from analyze_bias import analyzeBias

# Create fastAPI instance
app = FastAPI()

# Validate user data
class AnalyzeRequest(BaseModel):
	paragraphs: List[str]

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
   
# Expose Render stuff   
@app.get("/")
def root():

	return {"status": "OK", "message": "FastAPI is running on Render"}





