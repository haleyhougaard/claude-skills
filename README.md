# claude-skills

Three Claude skills I use in my own work, published so you can run them too.

Each skill is a folder with a `SKILL.md`, the file Claude reads to learn the job. Some also carry reference notes and small scripts.

| Skill | What it does |
|---|---|
| [etsy-pod-operator](etsy-pod-operator) | Takes a print-on-demand Etsy shop from keyword research to a finished listing, then checks at the end of the batch that nothing went live by accident. |
| [ugc-script-writer](ugc-script-writer) | Writes TikTok Shop scripts that sound like a person holding the product, with a note at the end flagging any claim you should confirm before posting. |
| [growth-operator](growth-operator) | Reads a DTC brand's ads, store and email numbers, applies written kill and promote rules, and writes the founder a one-page brief. It acts only on an approval. |

## How to use one

- **Claude Code:** copy the skill's folder into `~/.claude/skills/`.
- **Claude app:** zip the folder and add it as a custom skill in your settings.

Then ask for the job in plain words. "Write me a TikTok script for this candle" is enough to wake the UGC writer.

## How they're built

Publishing is always a choice a person makes. The Etsy operator saves drafts unless you say otherwise and sweeps for anything that slipped live. The growth operator proposes actions and executes only the ones you approve, and it labels every number as live or sample data.

None of these files hold keys, account IDs or personal details. Your own connectors hold your credentials, and nothing here asks you to paste one.

## Who made this

Haley Hougaard. I run And/Also Studio, a Fractional AI Officer practice for founder-led brands in beauty, wellness, interior design and the creator economy. Before that I spent about ten years in beauty brand marketing.

[haleyhougaard.com](https://haleyhougaard.com)

## License

MIT. Use them, change them, ship them. Keep the license file with any copy.
