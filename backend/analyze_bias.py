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
		print("[Log] No items to analyze.")
		return []

	print("[Log] Analyzing...")
	
	systemPrompt = """
You are a content analysis engine that detects bias and argumentative fallacies in text.

You MUST output valid JSON only, no explanation text.

Given a list of paragraphs, you will detect these labels:

- "None": No notable bias.
- "Personal Opinion": Expresses a subjective personal view or feeling. Note that this is specifically from the writer of the article and NOT from directly quoted statements, which tend to have biased language. 
- "Ad Hominem": Attacks a person or group instead of addressing the argument.
- "Hasty Generalization": Uses sweeping or absolute generalizations from limited evidence.
- "Strawman": Argues against an oversimplified or otherwise distorted view of the information.
- "Slippery Slope": Claims that a singular event will give rise to multiple events.
- "Red Herring": Bringing up unrelated or irrelevant issues to oppose a view.
- "Bandwagoning": Basing validity of argument on how many people believe the same thing.
- "Misleading": A statement that is either completely false or partially true but intends to mislead the reader.
This can be many things, and you may pull from whatever sources that say otherwise so long as they too
are not biased. Like for example if someone pulls up a faulty statistic from an unreliable source. Citations must be included if applicable.

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
- Use "None" when no bias type clearly applies.
- Keep "Reason" short (1-2 sentences).
- DO NOT detect bias from quotes. They do not reflect the article writer's true thoughts. If you detect bias from a statement like '"This is very bad," said John Doe.' Then the results will not be accurate.
"""

	# Set up JSON table from paragraphs list
	userPayload = {
		"paragraphs": [
			{"index": item["index"], "text": item["text"]}
			for item in llmItems
		]
	}

	# Push JSON data into the userPayload table from the LLM response.
	try:
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
				temperature=0,
				max_output_tokens=100000,
			)
	except Exception as e:
		print("!! LLM ERROR !!", repr(e))
		raise

	# Fetch LLM response text
	outputText = response.output[0].content[0].text
	print(outputText)
	
	# Load JSON data from response
	try:
		parsed = json.loads(outputText)
	except json.JSONDecodeError as e:
		raise RuntimeError(f"[Log] LLM returned non JSON output: {outputText}") from e

	if not isinstance(parsed, list):
		raise RuntimeError(f"[Log] LLM output is not a list: {parsed}")

	if outputText:
		print("[Log] Successully returned JSON output.")
	else:
		print("[Log] Recieved no output.")
	
	return parsed

"""
Analyzes bias from an array of string inputs.

@params paragraphs - List of { "text": str } objects
@returns {object[]} - JSON data to be parsed by the frontend
"""
def analyzeBias(paragraphs: List[str]) -> List[Dict[str, Any]]:
	print("[Log] Starting analyzis...")
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
			label = item.get("label", "None")
			reason = item.get("reason", "")

			if label and label != "None":
				# Only add if LLM thinks there's bias
				results[idx] = {
					"index": idx,
					"text": paragraphs[idx],
					"label": label,
					"reason": reason,
				}
	else:
		print("[Log] WARNING: Paragraphs error. Cannot analyze.")

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

	print("[Log] Done!")
	return merged
















