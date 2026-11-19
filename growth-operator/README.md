# growth-operator

A daily growth check for a DTC brand. It reads Meta Ads, Shopify, Klaviyo and Clarity, applies rules you write in a Google Sheet, and hands the founder a one-page brief with proposed actions.

It spends, pauses, sends and publishes nothing on its own. Approved actions run, everything else is logged, and every number in the brief says whether it came from a live account or sample data.

**Needs:** the official Klaviyo, Shopify, Meta Ads and Clarity connectors (any you skip are marked "not connected" in the brief), a Google Drive folder named `Growth Operator` with a Rules sheet, and optionally an image model for email hero images.
