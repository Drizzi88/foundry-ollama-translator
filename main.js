Hooks.once("ready", () => {
  console.log("ollama-translator | ready hook triggered");

  Hooks.on("renderItemSheet", async (app, html) => {
    const item = app?.object;
    if (!item) return;

    // Restrict to these types
    const supportedTypes = ["spell", "feat", "weapon", "equipment", "consumable", "tool"];
    if (!supportedTypes.includes(item.type)) return;

    // Avoid duplicate buttons
    if (html.closest(".app").find(".ollama-translate-button").length > 0) return;

    const button = $(`
      <a class="ollama-translate-button" style="margin-left: 6px;" title="Mit Ollama übersetzen">
        <i class="fas fa-language"></i> Übersetzen
      </a>
    `);

    const titleElement = html.closest(".app").find(".window-title");
    if (titleElement.length > 0) {
      titleElement.after(button);
    } else {
      // Fallback: Add to sheet header
      html.find(".sheet-header").append(button);
    }

    button.on("click", async () => {
      const description = item.system?.description?.value ?? item.system?.description ?? "";

      if (!description || typeof description !== "string") {
        ui.notifications.warn("Keine Beschreibung zum Übersetzen gefunden.");
        return;
      }

      const prompt = `
Du bist ein erfahrener Übersetzer für Dungeons & Dragons 5e. Übersetze den folgenden Text ins Deutsche. Gib **nur** die Übersetzung zurück – ohne Anmerkungen oder Wiederholung des Originaltextes.

Text:
${description}`;

      try {
        ui.notifications.info("Übersetze über Ollama...");

        const response = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemma:3b-q4",
            prompt,
            stream: false
          })
        });

        const json = await response.json();
        const translated = json.response?.trim?.();

        if (!translated) {
          ui.notifications.error("Keine gültige Übersetzung erhalten.");
          return;
        }

        new Dialog({
          title: `Übersetzung: ${item.name}`,
          content: `<div style="max-height:400px; overflow:auto;"><p>${translated.replace(/\n/g, "<br>")}</p></div>`,
          buttons: {
            close: {
              icon: '<i class="fas fa-check"></i>',
              label: "Schließen"
            }
          },
          default: "close"
        }).render(true);
      } catch (err) {
        console.error("ollama-translator | Fehler bei der Übersetzung:", err);
        ui.notifications.error("Fehler bei der Verbindung zu Ollama.");
      }
    });

    console.log(`ollama-translator | Übersetzen-Button hinzugefügt für: ${item.name}`);
  });
});
