Hooks.on("ready", () => {
  console.log("ollama-translator | ready hook triggered");

  Hooks.on("renderItemSheet", (app, html, data) => {
    const translateButton = $(
      `<a class="ollama-translate" style="margin-left: 6px;" title="Übersetze mit Ollama">
        <i class="fas fa-language"></i> Übersetzen
      </a>`
    );

    // Inject the button into the sheet header
    html.closest(".app").find(".window-header .window-title").after(translateButton);

    translateButton.on("click", async () => {
      const item = app.object;
      const description = item.system.description?.value || "";
      if (!description) {
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
          body: JSON.stringify({ model: "gemma:3b-q4", prompt, stream: false })
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

    console.log("ollama-translator | Translate button added to item sheet");
  });
});
