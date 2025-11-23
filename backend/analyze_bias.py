"""
This is the LLM backend to analyze the text for bias.

@author Jude Rorie
@date 11/16/2025

"""

import re
from typing import List, Dict, Optional, Tuple, Any
import json
import os
from openai import OpenAI
from dotenv import load_dotenv

# Create OpenAI client
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

"""
Calls the OpenAI LLM with a specialized prompt.

@params {object[]} llmItems - Object list of { "index": int, "text": str }
@returns {object[]} - List of { "index", "label", "reason" }

"""
def callBiasLLM(llmItems: List[Dict]) -> List[Dict]:
	if not llmItems:
		return []

	systemPrompt = """
You are a content analysis engine that detects bias and argumentative fallacies in text.

You MUST output valid JSON only, no explanation text.

Given a list of paragraphs, you will detect these labels:

- "none": no notable bias
- "personal opinion": expresses a subjective personal view or feeling. note that this is specifically from the writer of the article and NOT from directly quoted statements, which tend to have biased language. 
- "ad hominem": attacks a person or group instead of addressing the argument
- "hasty generalization": uses sweeping or absolute generalizations from limited evidence
- "strawman": argues against an oversimplified or otherwise distorted view of the information
- "slippery slope": claims that a singular event will give rise to multiple events
- "red herring": bringing up unrelated or irrelevant issues to oppose a view
- "bandwagoning": basing validity of argument on how many people believe the same thing
- "misleading": a statement that is either completely false or partially true but intends to mislead the reader.
this can be many things, and you may pull from whatever sources that say otherwise so long as they too
are not biased. like for example if someone pulls up a faulty statistic from an unreliable source.

Input format (JSON):
{
  "paragraphs": [
    { "index": <int>, "text": "<paragraph text>" },
    ...
  ]
}

Output format (JSON only):
[
  {
    "index": <int>,  // same index as in the input
    "label": the labels provided earlier (none, personal opinion, ad hominem, etc.)",
    "reason": "<short explanation>"
  },
]

Rules:
- ALWAYS include an entry for every paragraph you receive.
- Use "none" when no bias type clearly applies.
- Keep "reason" short (1-2 sentences).
- DO NOT detect bias from quoted statements. Just detect bias from what the writer of the article says. If you detect bias from a statement like '"This is very bad," said John Doe.' Then the results will not be accurate. 
"""

	# Set up JSON table from paragraphs list
	userPayload = {
		"paragraphs": [
			{"index": item["index"], "text": item["text"]}
			for item in llmItems
		]
	}

	# Push JSON data into the userPayload table from the LLM response.
	response = client.responses.create(
		model="gpt-4.1-mini",
		input=[
			{
				"role": "system",
				"content": systemPrompt.strip()
			},
			{
				"role": "user",
				"content": json.dumps(userPayload, ensure_ascii=False)
			}
		],
		temperature=0.0,
		max_output_tokens=2147483648,
	)

	# Fetch LLM response text
	outputText = response.output[0].content[0].text
	print(outputText)
	
	# Load JSON data from response
	try:
		parsed = json.loads(outputText)
	except json.JSONDecodeError as e:
		raise RuntimeError(f"LLM returned non JSON output: {outputText}") from e

	if not isinstance(parsed, list):
		raise RuntimeError(f"LLM output is not a list: {parsed}")
    
	print("[Analysis] Successully returned JSON output.")
	return parsed

"""
Analyzes bias from an array of string inputs.

@params paragraphs - List of { "text": str } objects
@returns {object[]} - JSON data to be parsed by the frontend
"""
def analyzeBias(paragraphs: List[str]) -> List[Dict[str, Any]]:
	results: Dict[int, Dict[str, Any]] = {}
	llmItems: List[Dict[str, Any]] = []

	# Create results table
	for idx, text in enumerate(paragraphs):
		llmItems.append({"index": idx, "text": text})

	# Call LLM to receive data
	if llmItems:
		# Get json data table
		llmOutputs = callBiasLLM(llmItems)
		for item in llmOutputs:
			idx = item["index"]
			label = item.get("label", "none")
			reason = item.get("reason", "")

			if label and label != "none":
				# Only add if LLM thinks there's bias
				results[idx] = {
					"index": idx,
					"text": paragraphs[idx],
					"label": label,
					"reason": reason,
				}

	# Normalize data for js frontend
	merged = []
	for idx in sorted(results.keys()):
		r = results[idx]
		merged.append({
			"index": r["index"],
			"text": r["text"],
			"label": r["label"],
			"reason": r["reason"],
		})

	return merged


