/**
 * This is the parser for Fox News.
 *
 * This parser uses extracts metadata and structured
 * content from a Fox News article.
 *
 * @author Jude Rorie
 * @date 11/29/2025
 * @modified 12/01/2025
 *
 */

/**
 * Parses the page's embedded JSON-LD metadata script. Which contains
 * the title, author, and description, which is typically not found
 * within the HTML <article> block.
 * @returns {object|null} An object with metadata or null if not found.
 */
function parseMetadata() {
	const metadataScript = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

	if (!metadataScript) {
		console.error("[Parser] Could not find the JSON-LD metadata script.");
		return null;
	}

	let metadata = null;

	for (const script of metadataScript) {
		try {
			const data = JSON.parse(script.textContent);

			// Handle both direct object and @graph arrays
			const candidates = Array.isArray(data) ? data
			: Array.isArray(data['@graph']) ? data['@graph']
			: [data];

			const article = candidates.find(item => item['@type'] === 'NewsArticle' || item['@type'] === 'Article');

			if (article) {
				metadata = article;
				break;
			}
		} catch (error) {
			console.error("[Parser] Failed to parse JSON-LD metadata:", error);
		}
	}

	if (!metadata) return null;

	const author = (() => {
		if (!metadata.author) return "Author not found";
		if (Array.isArray(metadata.author)) {
			return metadata.author[0]?.name || "Author not found";
		}
		if (typeof metadata.author === "object") {
			return metadata.author.name || "Author not found";
		}
		return String(metadata.author);
	})();

	return {
		title: metadata.headline || metadata.name || "Title not found",
		author,
		description: metadata.description || "Description not found",
		datePublished: metadata.datePublished || "Date not found",
		dateModified: metadata.dateModified || "Date modified not found"
	};
}

/**
 * Parses the main content of the article by searching its semantic
 * structure. It iterates through elements within the main article
 * container and classifies them based on the type of the element.
 * @returns {object[]} An array of content objects (e.g., subheading, paragraph).
 */
function parseArticleContent() {
	let articleContainer =
		document.querySelector('main article') ||
		document.querySelector('article') ||
		document.querySelector('main [data-component="article-body"]') ||
		document.querySelector('#article-body') ||
		document.querySelector('[section="article-body"]') ||
		document.querySelector('[data-testid="article-body"]') ||
		document.querySelector('[data-testid="article-root"]');

	if (!articleContainer) {
		console.error("[Parser] Could not find the main 'article' container within [data-component].");
		return [];
	}

	const content = [];

	if (articleContainer) {
		const elements = articleContainer.querySelectorAll('h2, p, figure');

		elements.forEach(element => {

			// Subheadings
			if (element.tagName === 'H2') {
				content.push({ type: 'subheading', text: element.textContent.trim(), element: element });

			// Paragraphs
			} else if (element.tagName === 'P') {
				const text = element.textContent.trim();

				// Ignore paragraphs that are just bold text holders or empty
				if (text && element.querySelector('b') === null) {
					content.push({ type: 'paragraph', text, element: element });
				}

			// Images and their captions
			} else if (element.tagName === 'FIGURE') {
				const img = element.querySelector('img');
				const caption = element.querySelector('figcaption');
				if (img) {
					content.push({
						type: 'image',
						src: img.src,
						caption: caption ? caption.textContent.trim() : '',
						element: element
					});
				}
			}
		});

		return content;
	}

	// Fallback: no container found, try paragraph selectors globally
	console.warn("[Parser] No article container found, falling back to global selectors.");

	const paragraphs = document.querySelectorAll(
		'[data-testid="paragraph"], ' +
		'[data-testid="article-body"] p, ' +
		'article p'
	);

	paragraphs.forEach(p => {
		const text = p.textContent.trim();
		if (text && p.querySelector('b') === null) {
			content.push({
				type: 'paragraph',
				text,
				element: p
			});
		}
	});

	return content;
}

// --------------------------------------------------------------
// ------------------------Main Execution------------------------
// --------------------------------------------------------------

/**
 * Temporary formatting function for testing, and POC.
 */
function parseFoxArticle() {
	const summaryInfo = parseMetadata();
	const articleContent = parseArticleContent();

	if (summaryInfo) {
		console.log("--- Summary Info ---");
		console.log(`Title: ${summaryInfo.title}`);
		console.log(`Author: ${summaryInfo.author}`);
		console.log(`Description: ${summaryInfo.description}`);
		console.log(`Published: ${summaryInfo.datePublished}`);
		console.log(`Modified: ${summaryInfo.dateModified}`);
		console.log("\n");
	}

	if (articleContent.length > 0) {
		console.log("--- Article Content ---");
		console.log(articleContent);
	} else {
		console.error("[Parser] Failed to extract any article content.");
	}

	return articleContent;
}
