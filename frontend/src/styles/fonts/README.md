# Self-hosted web fonts

These `.woff2` files are the **latin subset** of two open-source families,
served from our own origin so that rendering the site makes no request to
Google Fonts / `fonts.gstatic.com` (privacy: GDPR Art. 6, TDDDG §25).

| File | Family | Source | Licence |
| --- | --- | --- | --- |
| `source-sans-3.woff2` | Source Sans 3 (variable weight axis) | Adobe, via Google Fonts latin subset | SIL OFL 1.1 |
| `playfair-display.woff2` | Playfair Display (variable weight axis) | The Playfair Project, via Google Fonts latin subset | SIL OFL 1.1 |
| `playfair-display-italic.woff2` | Playfair Display Italic (variable) | The Playfair Project, via Google Fonts latin subset | SIL OFL 1.1 |

`OFL.txt` is the full licence text. The same files are mirrored in
`static/fonts/` for the legacy Jinja templates; `../fonts.css` (and
`static/css/fonts.css`) declare the `@font-face` rules. Those `@font-face`
blocks deliberately mirror the discrete weights the Google `css2` stylesheet
served (Source Sans 3 400–800, Playfair Display 600/800 + italic 700) rather
than a single open `font-weight` range, so the font-matching outcome — and the
rendered result — is identical to the previous remote setup.

To refresh: request the family from `https://fonts.googleapis.com/css2` with a
modern browser `User-Agent`, take the `/* latin */` `src` URL for each face,
download the `.woff2`, and drop it in here and in `static/fonts/`.
