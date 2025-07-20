Hooks.once("ready", () => {
  console.log("ollama-translator | ready hook triggered");

  if (!ItemDirectory.prototype._ollamaPatched) {
    const original = ItemDirectory.prototype.contextMenuOptions;
    console.log("ollama-translator | patching contextMenuOptions");

    ItemDirectory.prototype.contextMenuOptions = function () {
      const options = original.call(this);
      console.log("ollama-translator | menu options before patch:", options.length);

      options.push({
        name: "Übersetzen (Ollama)",
        icon: '<i class="fas fa-language"></i>',
        condition: li => {
          console.log("ollama-translator | context menu condition triggered for", li);
          return true;
        },
        callback: async li => {
          console.log("ollama-translator | Übersetzen clicked", li);
          const itemId = li.dataset.documentId;
          const item = game.items.get(itemId);
          console.log("ollama-translator | found item:", itemId, item);

          if (item) {
            await translateItemText(item);
          } else {
            console.warn("ollama-translator | no item found for id", itemId);
          }
        }
      });

      console.log("ollama-translator | menu options after patch:", options.length);
      return options;
    };

    ItemDirectory.prototype._ollamaPatched = true;
    console.log("ollama-translator | patch complete");
  } else {
    console.log("ollama-translator | already patched");
  }
});

async function translateItemText(item) {
  console.log("ollama-translator | translateItemText called for", item.name);

  const text = item.system.description?.value || item.system.rules?.value;
  if (!text) {
    ui.notifications.warn("Kein übersetzbarer Text gefunden.");
    console.warn("ollama-translator | item has no translatable text");
    return;
  }

  const prompt = `
Du bist ein erfahrener Übersetzer für Dungeons & Dragons 5e. Übersetze den folgenden Text ins Deutsche. Gib **nur** die Übersetzung zurück – ohne Anmerkungen oder Wiederholung des Originaltextes.

Text:
${text}`;

  try {
    console.log("ollama-translator | sending prompt to Ollama...");
    const resp = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gemma:3b-q4", prompt: prompt, stream: false })
    });

    const json = await resp.json();
    console.log("ollama-translator | Ollama response:", json);

    const translated = typeof json.response === "string"
      ? json.response.trim()
      : json.response?.content?.trim() || "";

    if (!translated) {
      ui.notifications.error("Ollama hat keine gültige Übersetzung zurückgegeben.");
      console.error("ollama-translator | invalid response", json);
      return;
    }

    const confirmed = await Dialog.confirm({
      title: "Übersetzung übernehmen?",
      content: `<div style="max-height:300px; overflow:auto;"><p>${translated.replace(/\n/g, "<br>")}</p></div>`,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });

    if (confirmed) {
      await item.update({ "system.description.value": translated });
      ui.notifications.info("Übersetzung gespeichert.");
      console.log("ollama-translator | Übersetzung gespeichert.");
    } else {
      console.log("ollama-translator | user declined translation");
    }
  } catch (err) {
    console.error("ollama-translator | Fehler beim Übersetzen", err);
    ui.notifications.error("Fehler bei der Übersetzung via Ollama.");
  }
}
