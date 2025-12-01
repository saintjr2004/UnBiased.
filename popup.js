/**
 * This is the logic for printing text from the parsers.
 *
 * @author Jude Rorie
 * @date 10/30/2025
 *
 */

const output = document.getElementById('output');
const urlText = document.getElementById('url');

/*
 * Main logic executed once Chrome identifies the active tab.
 * Queries the current active tab, verifies it's a valid news article.
 * injects script to extract HTML, loads custom parser, extracts paragraphs.
 *
 * @param {object[]} tabs - Array of active tabs returned by Chrome
 */
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
	const tab = tabs[0];
	if (!tab || !tab.url) {
		output.textContent = 'No active tab detected.'; // Update UI message
		return; // Stop execution if no tab or missing URL
	}

	const url = tab.url; // Store page URL
	const parsedUrl = new URL(url);
	
	urlText.textContent = parsedUrl.origin;
	
	let site = 'null';
	
	// Validate that the tab is a valid news article URL using regex
	if (url.includes("bbc.co.uk") || url.includes("bbc.com")) {
		site = 'bbc';
	} else if (url.includes("nbc") || url.includes("nbcnews.com")) {
		site = 'nbc';
	} else if (url.includes("cbsnews.com")) {
		site = 'cbs';
	} else if (url.includes("foxnews.com") || url.includes("fox.com")) {
		site = 'fox';
	} else if (url.includes("cnn.com")) {
		site = 'cnn';
	} else if (url.includes("theguardian.com")) {
		site = 'guardian';
	}
	
	if (site === 'null') {
		output.textContent = 'This is not a valid article.';
		return;
	}

	output.textContent = 'Parsing article...';

	try {
		/**
		 * Inject content script to retrieve the page's HTML source by executing
		 * document.documentElement.outerHTML inside the tab.
		 */

		const [{ result: html }] = await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: () => document.documentElement.outerHTML
		});

		// Create hidden iframe to safely parse HTML without polluting popup DOM
		const iframe = document.createElement('iframe');
		iframe.style.display = 'none';
		document.body.appendChild(iframe);

		const doc = iframe.contentDocument;

		// Write the scraped HTML into the new iframe context
		doc.open();
		doc.write(html);
		doc.close();

		// Load scripts
		const script = doc.createElement('script');
		script.src = chrome.runtime.getURL('parsers/' + site + '_parser.js');
		
		// --- script.onload ---
		/**
		 * Executes when parser script has loaded inside iframe.
		 * Attempts custom parsing functions, falls back to raw scraping.
		 */
		script.onload = () => {
			try {
				// Parse text based on article type
				let parserFunc;
				
				if (site === 'bbc') {
					parserFunc = doc.defaultView.parseBBCArticle;
				} else if (site === 'nbc') {
					parserFunc = doc.defaultView.parseNBCArticle;
				} else if (site === 'cnn') {
					parserFunc = doc.defaultView.parseCNNArticle;
				} else if (site === 'cbs') {
					parserFunc = doc.defaultView.parseCBSArticle;
				} else if (site === 'fox') {
					parserFunc = doc.defaultView.parseFoxArticle;
				} else if (site === 'guardian') {
					parserFunc = doc.defaultView.parseGuardianArticle;
				}
				
				let paragraphs = [];

				// If parser function exists, call it
				if (parserFunc) {
					const result = parserFunc();

					if (Array.isArray(result)) {
						console.log("[Parser] Parsing...");
						paragraphs = result
						.filter(
							item =>
								item &&
								// Check for strings
								typeof item.text === "string" &&
								item.text.trim() &&
								// Ignore non-text items
								item.type !== "image" && item.type !== "video" && item.type !== "embed"
						)
						.map(item => item.text.trim());
					}
					
					console.log("[Parser] Specialized parser results:", paragraphs);
				}
				
				// Backup parser that just extracts all paragraph elements, in case specialized parser does not work
				if (!paragraphs || paragraphs.length === 0) {
					console.warn('[Parser] Falling back to raw paragraph scraping.');

					// Try to detect primary article container elements
					const article = doc.querySelector(
						'main article, main [data-component="article-body"], article, [data-component="text-block"]'
					);

					// If found, collect all <p> text inside
					if (article) {
						paragraphs = Array.from(article.querySelectorAll('p'))
							.map(p => p.innerText.trim())
							.filter(Boolean);
					}
					
					console.log("[Parser] Backup parser results:", paragraphs);
				}
				
				// Display bias results to user
				output.textContent = 'Analyzing...';
				analyzeBias(paragraphs);
				
			} catch (error) {
				console.error('[Parser] Runtime error:', error);
				output.textContent = 'Error parsing article.';
			}
		};
		
		// Append parser script to iframe once body exists
		if (doc.body) {
			doc.body.appendChild(script);
		} else {
			doc.addEventListener(
				'DOMContentLoaded',
				() => {
					doc.body.appendChild(script);
				},
				{ once: true }
			);
		}

	} catch (error) {
		// Catch any script execution failures
		console.error('[Parser] Execution error:', error);
		output.textContent = 'Execution error.';
	}
});