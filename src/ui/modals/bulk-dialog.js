/**
 * Bulk Alert Processing Dialog
 *
 * BulkDialog --> BulkProcessor
 *          |--> UIManager (Bulk status)
 */
import { ModalStyles, ModalUtils } from "./modal-utils.js";
import { BulkProcessor } from "../../features/bulk-processor.js";
import { UIManager } from "../ui-manager.js";

class BulkDialog {
  show() {
    const modal = ModalUtils.createModal(
      () => this.close(modal),
      () => this.close(modal),
    );

    const dialog = ModalUtils.createElement("div", ModalStyles.dialog);

    // Title
    const title = ModalUtils.createElement(
      "h3",
      ModalStyles.title,
      "Bulk Alert Processing",
    );

    // Instructions
    const instruction = ModalUtils.createElement(
      "p",
      ModalStyles.instruction,
      "Paste your alert IDs (space, comma, or newline separated):",
    );

    // Textarea
    const textarea = ModalUtils.createTextarea(
      "e.g., 679289778 679434984 679443707",
    );

    // Buttons
    const buttonRow = ModalUtils.createElement("div", ModalStyles.buttonRow);
    const cancelBtn = ModalUtils.createButton("Cancel");
    const startBtn = ModalUtils.createButton(
      "Start Bulk Processing",
      "primary",
    );

    // Event handlers
    cancelBtn.addEventListener("click", () => this.close(modal));
    startBtn.addEventListener("click", () => this.handleStart(textarea, modal));

    // Assemble dialog
    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(startBtn);

    dialog.appendChild(title);
    dialog.appendChild(instruction);
    dialog.appendChild(textarea);
    dialog.appendChild(buttonRow);

    modal.appendChild(dialog);
    ModalUtils.showModal(modal);

    // Focus textarea
    setTimeout(() => textarea.focus(), 100);
  }

  //   Handles the start button click
  handleStart(textarea, modal) {
    const text = textarea.value.trim();
    if (text) {
      const count = BulkProcessor.loadAlertIds(text);
      if (count > 0) {
        UIManager.showBulkStatus(
          `Bulk mode: ${count} alerts loaded. Press cmd + ↓ to start`,
        );
      } else {
        UIManager.showBulkStatus("No valid alert IDs found");
      }
    }
    this.close(modal);
  }

  //   Closes the modal dialog
  close(modal) {
    ModalUtils.closeModal(modal);
  }
}
export { BulkDialog };
