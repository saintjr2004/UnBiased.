/**
 * This is the logic for detecting biased text
 *
 * @author Jude Rorie
 * @author Shane Ruegg
 * @date 11/17/2025
 * @modified 12/01/2025
 *
 */

/**
 * Wrapper function that uses the OpenAI LLM to detect bias in the given paragraphs array.
 *
 * @param {string[]} paragraphs - List of paragraph string objects
 * @returns {Promise<object[]>} - The annotations list
 */
async function analyzeBias(paragraphs) {
	try {
		const response = await fetch("https://unbiased-heka.onrender.com/api/analyze-bias", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ paragraphs }),
		});

		if (!response.ok) {
			console.error("[Analysis] Server Error:", response.status, response.statusText);
			throw new Error("Bias analysis failed.");
		}

		// annotations: [{ index, text, label, reason }, ...]
		const annotations = await response.json();
		console.log("[Analysis] Bias analysis complete.");
		return annotations;

	} catch (error) {
		console.error(error);
    throw error;
	}
}

/**
 * Reads through the annotation labels and modifies the main window HTML to
 * display the bias flags.
 *
 * @param {object[]} annotations - List of objects containing paragraph index, paragraph text, bias label and reason from bias analysis
 */
function renderBiasResults(annotations) {
	const container = document.getElementById("output");
	if (!container) return;

	container.innerHTML = "";

	if (!annotations.length) {
		container.textContent = "No obvious bias detected.";
		return;
	}

	// Read through each annotation if they exist.
	annotations.forEach(a => {
		const block = document.createElement("div");
		block.className = "bias-block";

		block.innerHTML = `
			<p class="bias-text">"${a.text}"</p>
			<p class="bias-label"><strong>Type:</strong> ${a.label}</p>
			<p class="bias-reason"><strong>Reason:</strong> ${a.reason}</p>
		`;

		container.appendChild(block);
	});
}
