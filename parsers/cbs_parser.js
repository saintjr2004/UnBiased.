/**
 * This is the parser for the Columbia Broadcasting System (CBS).
 *
 * This parser uses extracts metadata and structured
 * content from a CBS news article.
 *
 * @author Shane Ruegg
 * @date 11/21/2025
 * @modified 12/01/2025
 *
 */

/**
 * Parses the page's embedded JSON-LD metadata script. Which contains
 * the title, author, and description.
 *
 * It loops through all JSON-LD scripts to find the one with
 * "@type": "NewsArticle", as CBS includes multiple JSON-LD scripts.
 *
 * @returns {object|null} An object with metadata or null if not found.
 */
function parseCBSMetadata() {
	const metadataScripts = document.querySelectorAll(
		'script[type="application/ld+json"]',
	);

	if (!metadataScripts || metadataScripts.length === 0) {
		console.error("Could not find any JSON-LD metadata scripts.");
		return null;
	}

	let metadata = null;
	try {
		// Loop through all script tags to find the "NewsArticle"
		for (const script of metadataScripts) {
			const data = JSON.parse(script.textContent);

			if (data && data["@type"] === "NewsArticle") {
				metadata = data;
				break;
			}
		}

		if (metadata === null) {
			console.error("Could not find the 'NewsArticle' JSON-LD metadata.");
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
	
		return {
			title: metadata.headline || "Title not found",
			author:
				metadata.author && metadata.author[0]
					? metadata.author[0].name
					: "Author not found",
			description: metadata.description || "Description not found",
			datePublished: metadata.datePublished || "Date not found",
			dateModified: metadata.dateModified || "Date modified not found",
		};
	} catch (error) {
		console.error("Failed to parse JSON-LD metadata:", error);
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
function parseCBSArticleContent() {
	const articleContainer = document.querySelector("article#article-0 section");

	if (!articleContainer) {
		console.error("Could not find the main content container <section>.");
		return [];
	}

	const content = []; // Array of elements
	const elements = Array.from(articleContainer.children); // Use children to avoid footer info

	elements.forEach((element) => {
		// Subheadings
		if (element.tagName === "H2") {
			content.push({
				type: "subheading",
				text: element.textContent.trim(),
				element: element
			});
		}

		// Paragraphs
		else if (element.tagName === "P") {
			const text = element.textContent.trim();

			// Ignore paragraphs that are just bold text holders or empty
			if (text && element.querySelector("b") === null) {
				content.push({
					type: "paragraph",
					text: text,
					element: element
				});
			}
		}

		// Images and their captions
		else if (element.tagName === "FIGURE") {
			const img = element.querySelector("img");
			const caption = element.querySelector("figcaption");
			if (img) {
				content.push({
					type: "image",
					src: img.src,
					caption: caption ? caption.textContent.trim() : "",
					element: element
				});
			}
		}
	});

	if (content.length > 0) {
		console.log("--- Article Content ---");
		console.log(content);
	} else {
		console.error("Failed to extract any article content.");
	}

	return content;
}