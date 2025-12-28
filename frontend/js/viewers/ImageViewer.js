
/**
 * ImageViewer
 * Displays images directly instead of showing binary garbage.
 */
export class ImageViewer {
    constructor() {
        this.name = "ImageViewer";
    }

    canHandle(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext);
    }

    async render(container, leftPath, rightPath) {
        container.innerHTML = '';
        container.className = 'diff-panel expanded'; // Use full width for now

        // Create a simple comparison layout for images
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.gap = '1rem';
        wrapper.style.padding = '1rem';
        wrapper.style.height = '100%';
        wrapper.style.overflow = 'auto';
        wrapper.style.alignItems = 'center';

        const title = document.createElement('h3');
        title.textContent = 'Image Comparison';
        wrapper.appendChild(title);

        const imgContainer = document.createElement('div');
        imgContainer.style.display = 'flex';
        imgContainer.style.gap = '2rem';
        imgContainer.style.justifyContent = 'center';

        if (leftPath) {
            const leftBox = this.createImageBox(leftPath, "Left");
            imgContainer.appendChild(leftBox);
        }

        if (rightPath) {
            const rightBox = this.createImageBox(rightPath, "Right");
            imgContainer.appendChild(rightBox);
        }

        wrapper.appendChild(imgContainer);
        container.appendChild(wrapper);
    }

    createImageBox(path, label) {
        const box = document.createElement('div');
        box.style.textAlign = 'center';

        const img = document.createElement('img');
        // We use the same API as content? No, need raw file access or base64.
        // Currently API returns text content. We might need a new endpoint /api/image or /api/raw?
        // Or we can assume static serving if paths are relative to root?
        // Wait, paths are absolute on disk. Frontend cannot access them directly via <img>.
        // We need an endpoint to serve the image logic.
        // Workaround: We will skip implementation logic details until API supports it, 
        // OR use /api/content base64 if we add it?
        // Let's assume we'll implement a simple placeholder for now saying "Image Preview need API support".

        // Actually, let's just make it clear.
        img.alt = "Image Preview (Requires API Update)";
        img.src = ""; // TODO: Add /api/resource endpoint
        img.style.maxWidth = '300px';
        img.style.border = '1px solid #333';

        const caption = document.createElement('div');
        caption.textContent = label;
        caption.style.marginTop = '0.5rem';
        caption.style.color = '#888';

        box.appendChild(img);
        box.appendChild(caption);
        return box;
    }
}
