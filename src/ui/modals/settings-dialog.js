/**
 * Application Settings Dialog
 */
import { ModalStyles, ModalUtils } from "./modal-utils.js";
import { SettingsManager } from "../../services/settings.js";
import { KeyboardHelpGenerator } from "../../utils/keyboard-help.js";
import { UIManager } from "../ui-manager.js";

class SettingsDialog {
  show() {
    const modal = ModalUtils.createModal(
      () => this.close(modal),
      () => this.close(modal),
    );

    const dialog = ModalUtils.createElement("div", ModalStyles.darkDialog);

    // Title
    const title = ModalUtils.createElement(
      "h3",
      ModalStyles.darkTitle,
      "⚙️ Settings",
    );

    // Current status
    const statusInfo = this.createStatusInfo();

    // Form fields
    const form = this.createForm();

    // Keyboard help
    const keyboardHelp = this.createKeyboardHelp();

    // Buttons
    const buttonRow = this.createButtons(form, modal);

    // Assemble dialog
    dialog.appendChild(title);
    dialog.appendChild(statusInfo);
    dialog.appendChild(form);
    dialog.appendChild(keyboardHelp);
    dialog.appendChild(buttonRow);

    modal.appendChild(dialog);
    ModalUtils.showModal(modal);

    // Focus first input
    setTimeout(() => {
      const firstInput = form.querySelector('input[type="text"]');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  createStatusInfo() {
    const settings = SettingsManager.getSettings();
    const div = ModalUtils.createElement(
      "div",
      `
      background: #2d2d30; border: 1px solid #404040; border-radius: 4px;
      padding: 12px; margin-bottom: 20px; font-size: 12px; color: #cccccc;
    `,
    );

    div.innerHTML = `
      <strong>Current Status:</strong><br>
      📡 Presigner Server: <code>${settings.presignerUrl}</code><br>
      💾 Auto-save: ${settings.autoSaveNotes ? "Enabled" : "Disabled"}<br>
      ⌨️ Keyboard Hints: ${settings.showKeyboardHints ? "Enabled" : "Disabled"}<br>
      🎆 Fireworks: ${settings.enableFireworks ? "Enabled" : "Disabled"}
    `;

    return div;
  }

  createForm() {
    const form = ModalUtils.createElement(
      "div",
      "display: flex; flex-direction: column; gap: 16px;",
    );
    const settings = SettingsManager.getSettings();

    // Presigner URL
    const urlGroup = this.createInputGroup(
      "S3 Presigner URL",
      "presignerUrl",
      settings.presignerUrl,
      "URL of the local S3 presigner server",
    );

    // Checkboxes
    const autoSaveGroup = this.createCheckboxGroup(
      "Auto-save Notes",
      "autoSaveNotes",
      settings.autoSaveNotes,
      "Automatically save notes as you type",
    );

    const hintsGroup = this.createCheckboxGroup(
      "Show Keyboard Hints",
      "showKeyboardHints",
      settings.showKeyboardHints,
      "Display keyboard shortcut hints on hover",
    );

    const fireworksGroup = this.createCheckboxGroup(
      "Enable Fireworks",
      "enableFireworks",
      settings.enableFireworks,
      "Show celebration fireworks for special events",
    );

    form.appendChild(urlGroup);
    form.appendChild(autoSaveGroup);
    form.appendChild(hintsGroup);
    form.appendChild(fireworksGroup);

    return form;
  }

  createInputGroup(label, name, value, description) {
    const group = ModalUtils.createElement(
      "div",
      "display: flex; flex-direction: column; gap: 4px;",
    );

    const labelEl = ModalUtils.createElement(
      "label",
      "font-weight: 500; color: #ffffff; font-size: 14px;",
      label,
    );

    const input = ModalUtils.createInput(
      value,
      `
      padding: 8px 12px; border: 1px solid #404040; background: #2d2d30;
      color: #cccccc; border-radius: 4px; font-size: 14px;
    `,
    );
    input.name = name;
    input.value = value;

    group.appendChild(labelEl);
    group.appendChild(input);

    if (description) {
      const desc = ModalUtils.createElement(
        "small",
        "color: #999999; font-size: 12px;",
        description,
      );
      group.appendChild(desc);
    }

    return group;
  }

  createCheckboxGroup(label, name, checked, description) {
    const group = ModalUtils.createElement(
      "div",
      "display: flex; align-items: flex-start; gap: 8px;",
    );

    const checkbox = ModalUtils.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = name;
    checkbox.checked = checked;
    checkbox.style.cssText = "margin-top: 2px; accent-color: #0e639c;";

    const labelContainer = ModalUtils.createElement(
      "div",
      "display: flex; flex-direction: column; gap: 2px;",
    );
    const labelEl = ModalUtils.createElement(
      "label",
      "font-weight: 500; color: #ffffff; font-size: 14px; cursor: pointer;",
      label,
    );

    labelEl.addEventListener(
      "click",
      () => (checkbox.checked = !checkbox.checked),
    );
    labelContainer.appendChild(labelEl);

    if (description) {
      const desc = ModalUtils.createElement(
        "small",
        "color: #999999; font-size: 12px;",
        description,
      );
      labelContainer.appendChild(desc);
    }

    group.appendChild(checkbox);
    group.appendChild(labelContainer);

    return group;
  }

  createKeyboardHelp() {
    const help = ModalUtils.createElement(
      "div",
      `
      background: #252526; border: 1px solid #404040; border-radius: 4px;
      padding: 16px; margin-top: 20px;
    `,
    );

    const title = ModalUtils.createElement(
      "h4",
      "margin: 0 0 12px 0; color: #ffffff; font-size: 14px;",
      "⌨️ Keyboard Shortcuts",
    );

    const shortcuts = ModalUtils.createElement(
      "div",
      "font-size: 12px; color: #cccccc; line-height: 1.4;",
    );
    const keyboardHelpHTML = KeyboardHelpGenerator.generateKeyboardHelpHTML();

    shortcuts.innerHTML = `
      <style>
        kbd { background: #1e1e1e; border: 1px solid #404040; border-radius: 3px;
              padding: 2px 6px; font-family: monospace; font-size: 11px; color: #ffffff; }
      </style>
      ${keyboardHelpHTML}
    `;

    help.appendChild(title);
    help.appendChild(shortcuts);

    return help;
  }

  createButtons(form, modal) {
    const container = ModalUtils.createElement(
      "div",
      "display: flex; justify-content: space-between; gap: 10px; margin-top: 24px;",
    );

    const leftButtons = ModalUtils.createElement(
      "div",
      "display: flex; gap: 10px;",
    );
    const rightButtons = ModalUtils.createElement(
      "div",
      "display: flex; gap: 10px;",
    );

    const resetBtn = ModalUtils.createButton(
      "Reset to Defaults",
      "secondary",
      true,
    );
    const cancelBtn = ModalUtils.createButton("Cancel", "secondary", true);
    const saveBtn = ModalUtils.createButton("Save Settings", "primary", true);

    // Custom style for save button
    saveBtn.style.cssText += "background: #0e639c; border: 1px solid #0e639c;";

    // Event handlers
    resetBtn.addEventListener("click", () => this.handleReset(modal));
    cancelBtn.addEventListener("click", () => this.close(modal));
    saveBtn.addEventListener("click", () => this.handleSave(form, modal));

    leftButtons.appendChild(resetBtn);
    rightButtons.appendChild(cancelBtn);
    rightButtons.appendChild(saveBtn);

    container.appendChild(leftButtons);
    container.appendChild(rightButtons);

    return container;
  }

  handleReset(modal) {
    if (
      confirm(
        "Are you sure you want to reset all settings to their default values?",
      )
    ) {
      SettingsManager.resetSettings();
      UIManager.showNotification("Settings reset to defaults", "success");
      this.close(modal);
    }
  }

  handleSave(form, modal) {
    const inputs = form.querySelectorAll("input, select");
    const newSettings = {};

    inputs.forEach((input) => {
      if (input.type === "checkbox") {
        newSettings[input.name] = input.checked;
      } else {
        newSettings[input.name] = input.value;
      }
    });

    // Validate presigner URL
    if (
      newSettings.presignerUrl &&
      !newSettings.presignerUrl.startsWith("http")
    ) {
      UIManager.showNotification(
        "Presigner URL must start with http:// or https://",
        "error",
      );
      return;
    }

    if (SettingsManager.setSettings(newSettings)) {
      UIManager.showNotification("Settings saved successfully", "success");
      this.close(modal);
    } else {
      UIManager.showNotification("Failed to save settings", "error");
    }
  }

  close(modal) {
    ModalUtils.closeModal(modal);
  }
}

export { SettingsDialog };
