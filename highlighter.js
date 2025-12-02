/**
 * This file handles all DOM manipulation on the active tab for highlighting.
 *
 * @author Shane Ruegg
 * @date 12/01/2025
 *
 */

/**
 * Injects CSS and executes highlighting logic in the active tab.
 *
 * @param {number} tabId - The ID of the tab to highlight
 * @param {object[]} annotations - List of bias annotations
 */
async function highlightBiasInPage(tabId, annotations) {
    if (!tabId || !annotations || annotations.length === 0) return;

    try {
        // Inject CSS
        await chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ['styles/bias_styles.css']
        });

        // Execute Highlighter
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: applyHighlights,
            args: [annotations]
        });

        console.log("[Highlighter] Highlights applied.");

    } catch (err) {
        console.error("[Highlighter] Failed to inject highlights:", err);
    }
}

/**
 * This function runs inside the web page context.
 * It finds elements by the 'data-bias-id' attribute and applies classes.
 *
 * @param {object[]} annotations
 */
function applyHighlights(annotations) {
    annotations.forEach(note => {
        if (note.label === 'none') return;

        const el = document.querySelector(`[data-bias-id="${note.index}"]`);

        if (el) {
            const biasType = note.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

            el.classList.add('bias-highlight');
            el.classList.add(`bias-${biasType}`);

            // Add native tooltip behavior
            el.title = `${note.label}: ${note.reason}`;
        }
    });
}
