/**
 * This is the logic for printing text from the parsers.
 *
 * @author Jude Rorie
 * @author Shane Ruegg
 * @date 10/30/2025
 * @modified 12/01/2025
 *
 */

const output = document.getElementById("output");
const urlText = document.getElementById("url");

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
    if (paragraphs && paragraphs.length > 0) {
      output.textContent = "Analyzing...";
      console.log("[Popup] Extracted paragraphs:", paragraphs);
      try {
        // Get Bias Data
        const annotations = await analyzeBias(paragraphs);

        // Render UI Bias Logic / View
        renderBiasResults(annotations);

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
 * @returns {string[]} Array of paragraph strings
 */
function extractArticleContentInTab(site) {
  let results = [];

  // Map site names to their global parser functions
  const parserFunctions = {
    bbc: "parseBBCArticle",
    nbc: "parseNBCArticle",
    cbs: "parseCBSArticle",
    fox: "parseFoxArticle",
    cnn: "parseCNNArticle",
    guardian: "parseGuardianArticle",
  };

  const funcName = parserFunctions[site];

  // Specialized Parser
  if (funcName && typeof window[funcName] === "function") {
    try {
      console.log(`[Content] Running ${funcName}...`);
      let rawContent = window[funcName]();
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
					results.push(item.text.trim());
				});
      }
    } catch (e) {
      console.error("[Content] Specialized parser failed:", e);
    }
  }

  // Raw Scraper
  if (results.length === 0) {
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
			results.push(el.innerText.trim());
		});
  }

  return results;
}
