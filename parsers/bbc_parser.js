/**
 * This is the parser for the British Broadcasting Corporation (BBC).
 *
 * This parser uses extracts metadata and structured
 * content from a BBC news article.
 *
 * @author Shane Ruegg
 * @date 10/13/2025
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
	const metadataScript = document.querySelector('script[type="application/ld+json"]');

	if (!metadataScript) {
		console.error("[Parser] Could not find the JSON-LD metadata script.");
		return null;
	}

	try {
		const metadata = JSON.parse(metadataScript.textContent);
		return {
			title: metadata.headline || "Title not found",
			author: metadata.author && metadata.author[0] ? metadata.author[0].name : "Author not found",
			description: metadata.description || "Description not found",
			datePublished: metadata.datePublished || "Date not found",
			dateModified: metadata.dateModified || "Date modified not found"
		};
	} catch (error) {
		console.error("[Parser] Failed to parse JSON-LD metadata:", error);
		return null;
	}
}

/**
 * Parses the main content of the article by searching its semantic
 * structure. It iterates through elements within the main article
 * container and classifies them based on the type of the element.
 *
 * @returns {object[]} An array of content objects (e.g., subheading, paragraph).
 */
function parseArticleContent() {
	const articleContainer = document.querySelector('main article, main [data-component="article-body"]');

	if (!articleContainer) {
		console.error("[Parser] Could not find the main <article> container within <main>.");
		return [];
	}

	const content = []; // Array of elements
	const elements = articleContainer.querySelectorAll('h2, p, figure'); // Most common elements in a BBC Article

	elements.forEach(element => {

		// Subheadings
		if (element.tagName === 'H2') {
			content.push({
				type: 'subheading',
				text: element.textContent.trim(),
				element: element
			});
		}

		// Paragraphs
		else if (element.tagName === 'P') {
			const text = element.textContent.trim();

			// Ignore paragraphs that are just bold text holders or empty
			if (text && element.querySelector('b') === null) {
				content.push({
					type: 'paragraph',
					text: text,
					element: element
				});
			}
		}

		// Images and their captions
		else if (element.tagName === 'FIGURE') {
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

// --------------------------------------------------------------
// ------------------------Main Execution------------------------
// --------------------------------------------------------------

/**
 * Temporary formatting function for testing, and POC.
 */
function parseBBCArticle() {
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
