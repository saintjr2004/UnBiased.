/**
 * This is the logic for fetching similar articles after bias analysis.
 *
 * @author Jude Rorie
 * @date 12/10/2025
 *
 */

// Use NewsAPI to search for articles.
let SIMILAR_ARTICLES_API = "https://newsapi.org/v2/everything?domains=bbc.com,bbc.co.uk,nbcnews.com,cbsnews.com,foxnews.com,cnn.com,theguardian.com";
const SIMILAR_ARTICLES_API_KEY = "0ddbde40ee704c2fa9da939d5d6fe434";

/**
 * Normalizes a raw URL into a URL object.
 *
 * @param {string} raw - Raw URL string
 * @returns {string} u - The new normalized URL
 */
function normalizeUrl(raw) {
	try {
		const u = new URL(raw);
		u.search = "";
		u.hash = "";
		return u.toString();
	} catch (e) {
		return raw;
	}
}

/**
 * Fetches a list of similar news articles based on a query string.
 *
 * This function sends a request to the configured Similar Articles API
 * (currently NewsAPI) and returns up to `limit` articles that appear
 * most relevant to the subject, headline, or topic supplied.
 *
 *
 * @param {string} query
 *		The topic or article title used as the search input.
 *		Most commonly the active tab’s page title.
 *
 * @param {string} [currentUrl=""] - The URL of the page being analyzed.
 *		Used to ensure the API does *not* return the same article.
 *
 * @param {int} limit - The number of similar articles to return. Only the top `limit` items will be returned after sorting/deduping.
 *
 * @returns {Promise<Array<{title: string, url: string, source?: string}>>}
 *	- A Promise resolving to an array of objects, each containing:
 *			- title: string
 *			- url: string
 *			- source: optional string (the news outlet)
 */
async function fetchSimilarArticles(query, currentUrl = "", limit) {
	
	// If no topic was provided, there's nothing meaningful to search for.
	if (!query) {
		console.warn("[Fetch] Empty query; skipping.");
		return [];
	}

	// Build the API URL
	// Note: We request slightly more articles than needed (limit + 3) to allow deduplication and self-URL filtering later.
	const url = SIMILAR_ARTICLES_API + "&q=" + query + "&pageSize=" + String(limit + 3) + "&sortBy=relevancy&language=en" + "&apiKey=" + SIMILAR_ARTICLES_API_KEY;

	let resp;
	try {
		// Execute API request with required headers.
		resp = await fetch(url, {
			method: "GET",
			headers: { "X-Api-Key": SIMILAR_ARTICLES_API_KEY }
		});
	} catch (e) {
		// Handles failed connections / offline cases.
		console.error("[Fetch] Network error:", e);
		return [];
	}

	// The request went through, but the API responded with an error code.
	if (!resp.ok) {
		console.error("[Fetch] API error:", resp.status);
		return [];
	}

	// Attempt to parse JSON. If parsing fails, use a safe fallback object.
	const data = await resp.json().catch(() => ({}));

	// Ensure we always have a valid array to iterate through.
	const articles = Array.isArray(data.articles) ? data.articles : [];

	// Normalize the current URL for reliable equality comparison.
	const normalizedCurrent = currentUrl ? normalizeUrl(currentUrl) : "";

	// Convert raw API objects into a clean shape (title, url, source)
	// and ensure entries have essential fields.
	const mapped = articles
		.map(a => ({
			title: a.title || "",
			url: a.url || "",
			source: (a.source && a.source.name) || ""
		}))
		.filter(a => a.title && a.url);

	// Remove duplicates and remove results that point back to the same URL.
	const deduped = [];
	for (const a of mapped) {
		const norm = normalizeUrl(a.url);

		// Skip the current article.
		if (normalizedCurrent && norm === normalizedCurrent) continue;

		// Skip duplicates where the normalized URLs match.
		if (deduped.some(b => normalizeUrl(b.url) === norm)) continue;

		// Safe to add.
		deduped.push(a);

		// Stop once we have the results.
		if (deduped.length >= limit) break;
	}

	// Return at most `limit` articles in the final trimmed list.
	console.log("[Fetch] API URL:", url);
	console.log("[Fetch] Returned articles:", deduped);
	return deduped;
}

/**
 * Function that renders the similar articles that were grabbed by fetchSimilarArticles
 *
 * @param {string[]} articles - List of URL string objects
 */
function renderSimilarArticles(articles) {
	const similarContainer = document.getElementById("similar-articles");

	if (!similarContainer) return;

	similarContainer.innerHTML = "";

	if (!articles || !articles.length) {
		similarContainer.textContent = "No similar coverage found.";
		return;
	}

	// Read through article URLS if they exist
	articles.forEach(a => {
		const link = document.createElement("a");
		link.href = a.url;
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		link.textContent = a.title + (a.source ? ` (${a.source})` : "");
		similarContainer.appendChild(link);
	});
}