# Felt Experience Poker — main site

Static multi-page site for feltexperiencepoker.com.

## Editing

All copy lives in `build.py`. Edit it, then:

```bash
python3 build.py
```

That regenerates the `.html` files. Commit the generator **and** the generated HTML —
Netlify publishes the committed files directly, with no build step.

`styles.css` is hand-edited and shared by every page.

`robots.txt` and `sitemap.xml` are hand-maintained — add new pages to both.
`404.html` is generated like the others but carries `noindex` instead of a canonical.

## Deploying

Push to `main`. Netlify builds from the repo and publishes the root.

## Notes

- Palette and type match the replayer and the coaching flyer: `#121212`, accent `#a7dca5`,
  League Spartan headings, Montserrat body.
- Commits must NOT carry `Co-Authored-By` trailers — Netlify's free tier counts them as a
  second Git contributor on private repos and fails the build.
