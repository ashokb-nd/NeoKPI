/**
 * Modal Utilities - Shared modal styling and helper functions
 */

// Centralized modal styling
const ModalStyles = {
  overlay: `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.7); display: flex;
    justify-content: center; align-items: center; z-index: 10001;
  `,

  dialog: `
    background: white; padding: 20px; border-radius: 8px;
    width: 500px; max-width: 90%; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `,

  darkDialog: `
    background: #1e1e1e; color: #cccccc; padding: 24px; border-radius: 8px;
    width: 500px; max-width: 90%; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `,

  title: "margin: 0 0 15px 0; color: #333; font-family: Arial, sans-serif;",
  darkTitle: "margin: 0 0 20px 0; color: #ffffff; font-size: 18px;",

  buttonRow:
    "display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;",

  button: `
    padding: 8px 16px; border-radius: 4px; cursor: pointer;
    font-family: Arial, sans-serif; font-size: 14px;
  `,

  primaryButton: "border: none; background: #007bff; color: white;",
  successButton: "border: none; background: #28a745; color: white;",
  secondaryButton: "border: 1px solid #ddd; background: #f5f5f5; color: #333;",
  darkSecondaryButton:
    "border: 1px solid #404040; background: #3c3c3c; color: #cccccc;",

  instruction:
    "margin: 0 0 10px 0; color: #666; font-family: Arial, sans-serif;",
  statusDiv: `
    margin-top: 10px; padding: 10px; border-radius: 4px; display: none;
    font-family: Arial, sans-serif; font-size: 13px;
  `,
};

// Simple helper functions
const ModalUtils = {
  // Creates a DOM element with optional styles and text content
  createElement(tag, styles, content = "") {
    const el = document.createElement(tag);
    if (styles) el.style.cssText = styles;
    if (content) el.textContent = content;
    return el;
  },

  // Creates a styled button with type-based appearance (primary, success, secondary)
  createButton(text, type = "secondary", isDark = false) {
    let buttonStyles = ModalStyles.button;

    switch (type) {
      case "primary":
        buttonStyles += ModalStyles.primaryButton;
        break;
      case "success":
        buttonStyles += ModalStyles.successButton;
        break;
      default:
        buttonStyles += isDark
          ? ModalStyles.darkSecondaryButton
          : ModalStyles.secondaryButton;
    }

    return this.createElement("button", buttonStyles, text);
  },

  // Creates a modal overlay with backdrop click and escape key handlers
  createModal(onBackdropClick, onEscapeKey) {
    const modal = this.createElement("div", ModalStyles.overlay);

    modal.addEventListener("click", (e) => {
      if (e.target === modal && onBackdropClick) onBackdropClick();
    });

    const escapeHandler = (e) => {
      if (e.key === "Escape") {
        if (onEscapeKey) onEscapeKey();
        document.removeEventListener("keydown", escapeHandler);
      }
    };
    document.addEventListener("keydown", escapeHandler);

    return modal;
  },

  // Creates a styled text input field with placeholder and custom styles
  createInput(placeholder = "", styles = "") {
    const input = this.createElement("input");
    input.placeholder = placeholder;
    input.style.cssText = `
      width: 100%; padding: 10px; border: 1px solid #ddd;
      border-radius: 4px; font-size: 14px; box-sizing: border-box;
      ${styles}
    `;
    return input;
  },

  // Creates a styled textarea with monospace font and resize handle
  createTextarea(placeholder = "") {
    const textarea = this.createElement("textarea");
    textarea.placeholder = placeholder;
    textarea.style.cssText = `
      width: 100%; height: 120px; padding: 10px; border: 1px solid #ddd;
      border-radius: 4px; font-size: 14px; resize: vertical; box-sizing: border-box;
      font-family: monospace;
    `;
    return textarea;
  },

  // Creates a styled file input specifically for CSV files with dashed border
  createFileInput() {
    const input = this.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.style.cssText = `
      width: 100%; padding: 10px; border: 2px dashed #ddd; border-radius: 4px;
      cursor: pointer; background: #f9f9f9; font-size: 14px;
      font-family: Arial, sans-serif;
    `;
    return input;
  },

  // Displays a modal by appending it to the document body
  showModal(modal) {
    document.body.appendChild(modal);
  },

  // Removes a modal from the DOM if it exists
  closeModal(modal) {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  },
};

// Exports
export { ModalStyles, ModalUtils };
