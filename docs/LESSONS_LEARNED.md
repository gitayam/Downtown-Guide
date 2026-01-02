# Lessons Learned

## Clipboard API & Safari Compatibility (Copy Image)

### The Problem
When implementing "Copy Image to Clipboard", we encountered a `NotAllowedError` in Safari. This occurred because Safari (and increasingly other browsers) enforces strict **User Activation** requirements. 

If there is any asynchronous "gap" (e.g., waiting for an image to generate via `html-to-image`) between the user click and the call to `navigator.clipboard.write()`, Safari considers the user gesture to have expired and blocks the request.

### The Solution
Safari 13.1+ supports passing a **Promise** directly into the `ClipboardItem` constructor. This allows the browser to recognize that the clipboard action was initiated by a user gesture, even if the data isn't ready yet.

**Incorrect Pattern (Fails in Safari):**
```javascript
const blob = await generateImage(); // Async delay
await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob })
]);
```

**Correct Pattern (Works in Safari):**
```javascript
const clipboardItem = new ClipboardItem({
    'image/png': generateImage().then(blob => {
        if (!blob) throw new Error("Blob generation failed");
        return blob;
    })
});
await navigator.clipboard.write([clipboardItem]);
```

---

## Image Generation: html2canvas vs html-to-image

### Observations
- **html2canvas**: Frequently hangs or produces blank images when capturing off-screen or complex styled elements. It relies on a heavy document-cloning process that is prone to failures in modern reactive frameworks.
- **html-to-image**: Significantly faster and more reliable. It uses SVG foreignObject or Canvas to render the DOM node directly. 

### Best Practices for Capturing Hidden Elements
To capture an element that shouldn't be visible to the user but must be rendered by the browser:
1. Use `position: fixed` or `position: absolute`.
2. Use a very low `z-index` (e.g., `-9999`) to hide it behind the UI.
3. Keep `opacity: 1` or a very low non-zero value (e.g., `0.01`). Browsers may skip rendering elements with `display: none` or `visibility: hidden`.
4. Ensure the background is opaque (e.g., `background-color: white`) if the captured element is transparent.
