# UnBiased.

**UnBiased** is a Google Chrome extension designed to promote media literacy by detecting biased language and logical fallacies in news articles in real-time.

<p align="center">
  <img src="icon.png" alt="UnBiased Icon" width="128"/>
</p>

## 🎯 Purpose
In an era of polarized media, it can be difficult to distinguish between objective facts and subjective manipulation. **UnBiased** aids readers by automatically scanning news articles, identifying subjective language, and highlighting logical fallacies. It empowers users to read critically by explaining *why* a specific sentence might be misleading.

## ✨ Features
* **Real-Time Analysis**: Instantly scans the active browser tab to extract and analyze article text.
* **Smart Highlighting**: Color-coded highlights are overlaid directly on the webpage text. Users can hover over these highlights to see a tooltip explaining the specific reasoning.
* **Bias Detection**: Identifies 8 distinct types of argumentative fallacies and bias:
    * **Personal Opinion**: Subjective views from the author.
    * **Ad Hominem**: Attacking the person rather than the argument.
    * **Hasty Generalization**: Sweeping claims based on limited evidence.
    * **Strawman**: Arguing against a distorted view of the opponent.
    * **Slippery Slope**: Claiming a small event will lead to extreme outcomes.
    * **Red Herring**: Distractions from the main issue.
    * **Bandwagoning**: Basing validity on popularity.
    * **Misleading**: False or partially true statements intended to deceive.
* **Site-Specific Parsing**: Uses custom parsers to cleanly extract text (ignoring ads/footers) from major news outlets:
    * BBC
    * NBC
    * Fox
    * CBS
    * CNN
    * The Guardian.
* **Cross-Reference News Article Linking** Provides links to news sources with similar article topics so the user can quickly cross-reference.

## 🛠️ Implementation
The application follows a client-server architecture:

1.  **Frontend (Chrome Extension)**:
    * **Manifest V3**: Built using modern web extension standards.
    * **Content Extraction**: When activated, the extension detects the site and injects a specific parser (e.g., `parsers/fox_parser.js`) to scrape text. If no specific parser exists, it utilizes a fallback scraper.
    * **Visualization**: The `highlighter.js` script maps analysis results back to the HTML DOM using a unique `data-bias-id` and injects CSS classes for styling.

2.  **Backend (FastAPI & AI)**:
    * **API**: A Python FastAPI server exposes the `/api/analyze-bias` endpoint.
    * **Intelligence**: Text is processed by **OpenAI's GPT-4.1-mini**. A specialized system prompt instructs the model to ignore quotes (as they belong to the interviewee) and output strict JSON containing bias labels and reasons.

## 🚀 Installation

### 1. Clone the Repository
Open your terminal and clone the repository to your local machine:
```bash
git clone [https://github.com/yourusername/Biased-Language-Detector.git](https://github.com/yourusername/Biased-Language-Detector.git)
```

### 2. Install the Extension in Chrome
1. Open **Google Chrome** (or any Chromium-based browser like Brave, Edge, or Arc).

2. Navigate to the Extensions page by typing `chrome://extensions` in the address bar.

3. **Turn on Developer Mode**: Toggle the switch in the top-right corner of the page.

4. Click the **Load unpacked** button that appears in the top-left.

5. Select the `Biased-Language-Detector-main` folder (this is the folder containing `manifest.json`) from your cloned repository.

6. The **UnBiased** extension icon should now appear in your browser toolbar.
