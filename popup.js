/**
 * This is the logic for printing text from the parsers.
 *
 * @author Jude Rorie
 * @author Shane Ruegg
 * @date 10/30/2025
 * @modified 12/10/2025
 *
 */

// Get HTML text elements
const output = document.getElementById("output");
const urlText = document.getElementById("url");
const similarSection = document.getElementById("similar-articles-section");
const similarContainer = document.getElementById("similar-articles");

/*
 * Main logic executed once Chrome identifies the active tab.
 * Queries the current active tab, verifies it's a valid news article.
 * injects the specific parser script, and extracts paragraphs.
 *
 * @param {object[]} tabs - Array of active tabs returned by Chrome
 */
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
	const tab = tabs[0];
	if (!tab || !tab.url) {
		output.textContent = "No active tab detected."; // Update UI message
		return; // Stop execution if no tab or missing URL
	}

	const url = tab.url; // Store page URL
	const parsedUrl = new URL(url);

	urlText.textContent = parsedUrl.origin;

	let site = "null";

	// Validate that the tab is a valid news article URL
	if (url.includes("bbc.co.uk") || url.includes("bbc.com")) {
		site = "bbc";
	} else if (url.includes("nbc") || url.includes("nbcnews.com")) {
		site = "nbc";
	} else if (url.includes("cbsnews.com")) {
		site = "cbs";
	} else if (url.includes("foxnews.com") || url.includes("fox.com")) {
		site = "fox";
	} else if (url.includes("cnn.com")) {
		site = "cnn";
	} else if (url.includes("theguardian.com")) {
		site = "guardian";
	}

	if (site === "null") {
		output.textContent = "This is not a valid article.";
		return;
	}

	output.textContent = "Parsing article...";

	try {
		// Inject the specific parser file (e.g., parsers/bbc_parser.js)
		try {
			await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				files: ["parsers/" + site + "_parser.js"],
			});
		} catch (fileError) {
			console.warn(
				`[Popup] Could not inject parser file for ${site}. It might be missing. Proceeding to fallback scraper.`,
				fileError,
			);
		}
		
		// Execute the extraction logic inside the tab
		const [{ result: paragraphs }] = await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: extractArticleContentInTab,
			args: [site],
		});

		// Handle results
		if (paragraphs.content && paragraphs.content.length > 0) {
			output.textContent = "Analyzing...";
			console.log("[Popup] Extracted paragraphs:", paragraphs.content);
			try {
				// Get Bias Data
				const annotations = await analyzeBias(paragraphs.content);

				// Render UI Bias Logic / View
				renderBiasResults(annotations);

				// Get similar articles
				try {
					const metadata = paragraphs.metadata
					console.log("[Popup] Extracted metadata:", metadata);
					
					if (similarSection && similarContainer) {
						// Set find similar articles status
						similarSection.classList.remove("hidden");
						similarContainer.textContent = "Finding similar articles...";
					}

					// Grab parsed URL, fetch 3 similar articles. Search using title first, and if there are no results then search with description.
					let similar = await fetchSimilarArticles(metadata.title, tab.url, 3) || await fetchSimilarArticles(metadata.description, tab.url, 3);
					
					// Render UI similar article results
					renderSimilarArticles(similar);
				} catch (e) {
					console.error("[Popup] Similar articles error:", e);
				}

				await highlightBiasInPage(tab.id, annotations);
				
				// Highlight Page Highlighter Logic
				await highlightBiasInPage(tab.id, annotations);
			} catch (err) {
				console.error(err);
				output.textContent = "Failed to analyze bias.";
			}
		} else {
			output.textContent = "Could not extract text content.";
			console.error("[Popup] No paragraphs returned.");
		}
	} catch (error) {
		console.error("[Popup] Execution error:", error);
		output.textContent = "Execution error.";
	}
});

/**
 * This function runs inside of the web page (content script context).
 * It attempts to call the specific parser function if it exists,
 * otherwise it will go to raw scraping.
 * @param {string} site - The site identifier
 * @returns {string[]} Array of paragraph strings with identifiers "content" and "metadata"
 */
function extractArticleContentInTab(site) {
	let results = {
		content: [],
		metadata: {},
	};
	
	// Map site names to their global parser functions
	const parserContentFunctions = {
		bbc: "parseBBCArticleContent",
		nbc: "parseNBCArticleContent",
		cbs: "parseCBSArticleContent",
		fox: "parseFoxArticleContent",
		cnn: "parseCNNArticleContent",
		guardian: "parseGuardianArticleContent",
	};
	const parserMetadataFunctions = {
		bbc: "parseBBCMetadata",
		nbc: "parseNBCMetadata",
		cbs: "parseCBSMetadata",
		fox: "parseFoxMetadata",
		cnn: "parseCNNMetadata",
		guardian: "parseGuardianMetadata",
	};

	const parserFuncName = parserContentFunctions[site];
	const metaFuncName = parserMetadataFunctions[site];
	
	// Specialized Parser
	if (parserFuncName && typeof window[parserFuncName] === "function") {
		try {
			console.log(`[Content] Running ${parserFuncName}...`);
			let rawContent = window[parserFuncName]();
			// Sanitize for text
			if (Array.isArray(rawContent)) {
				const validItems = rawContent.filter(item =>
					item &&
					typeof item.text === 'string' &&
					item.text.trim() &&
					!['image', 'video', 'embed'].includes(item.type)
				);

				// Iterate and TAG elements
				validItems.forEach((item, index) => {
					// Use the 'element' reference returned by the updated parsers
					if (item.element && item.element instanceof Element) {
						item.element.setAttribute('data-bias-id', index);
					}
					results.content.push(item.text.trim());
				});
			}
		} catch (e) {
			console.error("[Content] Specialized parser failed:", e);
		}
	}

	// Raw Scraper
	if (results.content.length === 0) {
		console.warn('[Content] Specialized parser returned no text. Using fallback scraper.');

		// Try to detect primary article container elements
		const article = document.querySelector(
			'main article, main [data-component="article-body"], article, [data-component="text-block"], #article-body, [itemprop="articleBody"]'
		);

		let elements = [];
		if (article) {
			elements = Array.from(article.querySelectorAll('p'));
		} else {
			elements = Array.from(document.querySelectorAll('p'));
		}

		elements = elements.filter(p => p.innerText.trim().length > 0);

		elements.forEach((el, index) => {
			el.setAttribute('data-bias-id', index);
			results.content.push(el.innerText.trim());
		});
	}

	// Grab metadata
	if (metaFuncName && typeof window[metaFuncName] === "function") {
		try {
			console.log(`[Content] Running ${metaFuncName}...`);
			results.metadata = window[metaFuncName]();	
		} catch (e) {
			console.error("[Content] Metadata scraper failed:", e);
		}
	}
	
	return results;
}
