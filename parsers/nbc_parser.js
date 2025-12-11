/**
 * This is the parser for the National Broadcasting Company (NBC).
 *
 * This parser uses extracts metadata and structured
 * content from a NBC news article.
 *
 * @author Jude Rorie
 * @date 10/29/2025
 * @modified 12/01/2025
 *
 */

/**
 * Parses the page's embedded JSON-LD metadata script. Which contains
 * the title, author, and description, which is typically not found
 * within the HTML <article> block.
 * @returns {object|null} An object with metadata or null if not found.
 */
function parseNBCMetadata() {
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

	if (metadata === null) {
		console.error("Could not find the JSON-LD metadata.");
		return null;
	} else {
		console.log("--- Summary Info ---");
		console.log(`Title: ${metadata.title}`);
		console.log(`Author: ${metadata.author}`);
		console.log(`Description: ${metadata.description}`);
		console.log(`Published: ${metadata.datePublished}`);
		console.log(`Modified: ${metadata.dateModified}`);
		console.log("\n");
	}

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
function parseNBCArticleContent() {
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

	if (content.length > 0) {
		console.log("--- Article Content ---");
		console.log(content);
	} else {
		console.error("[Parser] Failed to extract any article content.");
	}
	
	return content;
}