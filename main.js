Hooks.once("ready", () => {
  console.log("ollama-translator | ready hook triggered");

  // Intercept all ItemSheet variants: renderItemSheet, renderItemSheet5e, renderItemSheet5eItem, etc.
  for (const hook in Hooks._hooks) {
    if (hook.startsWith("renderItemSheet")) {
      Hooks.off(hook, handleRender); // Prevent duplicates
    }
  }

  Hooks.on("renderItemSheet", handleRender);         // base fallback
  Hooks.on("renderItemSheet5e", handleRender);       // most common
  Hooks.on("renderItemSheet5eItem", handleRender);   // some systems use this
});

function handleRender(app, html) {
  const item = app.object;
  if (!item) return;

  const supportedTypes = ["spell", "feat", "weapon", "equipment", "consumable", "tool", "skill"];
  if (!supportedTypes.includes(item.type)) return;

  const header = html.closest(".app").find(".window-header .window-title");
  if (!header.length || html.closest(".app").find(".ollama-translate").length) return;

  const button = $(
    `<a class="ollama-translate" style="margin-left: 8px;" title="Übersetze mit Ollama">
      <i class="fas fa-language"></i> Übersetzen
    </a>`
  );

  header.after(button);

  button.on("click", async () => {
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

  console.log(`ollama-translator | Übersetzen button added for ${item.name}`);
}
