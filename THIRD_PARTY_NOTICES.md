# Third-party notices

Ambiflex itself is MIT-licensed (see LICENSE). These files in the repository are not:

- `tools/launch-video/film/assets/gsap.min.js`: GSAP by GreenSock, under its own license (see the header of the file and https://gsap.com/standard-license). It is used only by the launch-video tooling, which is not part of the plugin.

Page assets loaded at runtime (fonts from Google Fonts, scripts from jsDelivr) are served under their own licenses by those services.

Cloud service icons on the Archi tab (AWS Architecture Icons, Azure Public Service Icons, Google Cloud icons) are not in this repository: the plugin downloads each pack from its provider at run time and embeds only the icons a map uses in the user's private page, under the provider's terms; the Google Cloud logo is Google's product logo, fetched from gstatic.com (https://aws.amazon.com/architecture/icons/, https://learn.microsoft.com/azure/architecture/icons/, https://cloud.google.com/icons).

The page's sound effects (hooks/page.ts) come from the ElevenLabs sound library (https://elevenlabs.io/sound-effects), royalty free under ElevenLabs' terms (https://elevenlabs.io/terms-of-use); the page credits elevenlabs.io in its legend.
