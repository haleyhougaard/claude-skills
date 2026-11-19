# etsy-pod-operator

Runs a Printify-fulfilled Etsy shop from "what should we sell" to a finished listing.

It picks niches where search volume is high and competition is thin, generates original art, turns it into clean print files, builds each product in Printify through the browser, and writes Etsy titles and tags that fit the 140 and 20 character limits.

The part I'd steal even if you never sell a shirt: Printify sometimes flips a product to Published on its own. This skill sweeps the whole batch at the end and hides anything that went live without a yes.

**Needs:** Printify with your Etsy shop connected, an image model (written for Higgsfield), and a browser tool such as Claude in Chrome.
