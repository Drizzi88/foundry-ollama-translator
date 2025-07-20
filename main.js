Hooks.once("ready", () => {
  console.log("ollama-translator | ready hook triggered");

  Hooks.on("renderItemSheet", (app, html) => {
    const item = app.object;
    const type = item?.type;

    // Only target specific item types
    const supportedTypes = ["spell", "feat", "item", "skill"];
    if (!supportedTypes.includes(type)) {
      console.log(`ollama-translator | Skipping item of type "${type}"`);
      return;
    }

    console.log(`ollama-translator | Item sheet rendered for: ${item.name} (${type})`);

    // Prevent duplicate buttons
    if (html.closest(".app").find(".ollama-translate").length) return;

    const translateBtn = $(
      `<a class="ollama-translate" style="margin-left: 8px;" title="Übersetze mit Ollama">
        <i class="fas fa-language"></i> Übersetzen
      </a>`
    );

    // Append to header after title
    html.closest(".app").find(".window-header .window-title").after(translateBtn);

    translateBtn.on("click", async () => {
      const description = item.system?.description?.value ||
                          item.system?.description ||
                          item.system?.details?.description ||
                          "";

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

    console.log("ollama-translator | Übersetzen button added.");
  });
});
