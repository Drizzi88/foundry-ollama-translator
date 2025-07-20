Hooks.once("ready", () => {
  console.log("ollama-translator | Patching contextMenuOptions for ItemDirectory");

  // Only patch once
  if (!ItemDirectory.prototype._ollamaPatched) {
    const original = ItemDirectory.prototype.contextMenuOptions;

    ItemDirectory.prototype.contextMenuOptions = function () {
      const options = original.call(this);

      options.push({
        name: "Übersetzen (Ollama)",
        icon: '<i class="fas fa-language"></i>',
        condition: li => true,
        callback: async li => {
          const itemId = li.dataset.documentId;
          const item = game.items.get(itemId);
          if (item) await translateItemText(item);
        }
      });

      return options;
    };

    ItemDirectory.prototype._ollamaPatched = true;
  }
});

async function translateItemText(item) {
  const text = item.system.description?.value || item.system.rules?.value;
  if (!text) return ui.notifications.warn("Kein übersetzbarer Text gefunden.");

  const prompt = `
Du bist ein erfahrener Übersetzer für Dungeons & Dragons 5e. Übersetze den folgenden Text ins Deutsche. Gib **nur** die Übersetzung zurück – ohne Anmerkungen oder Wiederholung des Originaltextes.

Text:
${text}`;

  try {
    const resp = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ model: "gemma:3b-q4", prompt: prompt, stream: false })
    });
    const json = await resp.json();
    const translated = typeof json.response === "string" ? json.response.trim() : json.response.content.trim();
    const confirmed = await Dialog.confirm({
      title: "Übersetzung übernehmen?",
      content: `<p>${translated.replace(/\\n/g, "<br>")}</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
    if (confirmed) {
      await item.update({ "system.description.value": translated });
      ui.notifications.info("Übersetzung gespeichert.");
    }
  } catch (err) {
    console.error(err);
    ui.notifications.error("Fehler bei der Übersetzung via Ollama.");
  }
}
