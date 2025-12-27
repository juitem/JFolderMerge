export class Modal {
    constructor(options = {}) {
        this.options = {
            title: options.title || 'Untitled',
            content: options.content || '',
            width: options.width || '500px',
            onClose: options.onClose || null,
            buttons: options.buttons || [] // { text, class, onClick }
        };
        this.element = null;
    }

    render() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal hidden'; // Start hidden, animate in?

        // Modal Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'modal-content glass-panel';
        contentDiv.style.width = this.options.width;

        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>${this.options.title}</h3>
            <button class="close-modal">&times;</button>
        `;
        contentDiv.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'modal-body';
        if (typeof this.options.content === 'string') {
            body.innerHTML = this.options.content;
        } else if (this.options.content instanceof Element) {
            body.appendChild(this.options.content);
        }
        contentDiv.appendChild(body);

        // Footer (only if buttons exist)
        if (this.options.buttons.length > 0) {
            const footer = document.createElement('div');
            footer.className = 'modal-footer';

            this.options.buttons.forEach(btnConfig => {
                const btn = document.createElement('button');
                btn.className = btnConfig.class || 'secondary-btn';
                btn.textContent = btnConfig.text;
                if (btnConfig.onClick) {
                    btn.addEventListener('click', (e) => btnConfig.onClick(e, this));
                }
                footer.appendChild(btn);
            });
            contentDiv.appendChild(footer);
        }

        modalOverlay.appendChild(contentDiv);

        // Bind Close Events
        const closeBtn = header.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => this.close());

        // Close on backing click?
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) this.close();
        });

        this.element = modalOverlay;
        document.body.appendChild(this.element);
    }

    open() {
        if (!this.element) this.render();
        // Force reflow for transition?
        requestAnimationFrame(() => {
            this.element.classList.remove('hidden');
        });
    }

    close() {
        if (!this.element) return;
        this.element.classList.add('hidden');
        if (this.options.onClose) this.options.onClose();

        // Remove from DOM after transition
        setTimeout(() => {
            if (this.element && this.element.parentElement) {
                this.element.remove();
            }
            this.element = null;
        }, 300); // Match CSS transition
    }

    // Helper to update body content dynamically
    setBody(content) {
        if (!this.element) return;
        const body = this.element.querySelector('.modal-body');
        body.innerHTML = '';
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else {
            body.appendChild(content);
        }
    }
}
