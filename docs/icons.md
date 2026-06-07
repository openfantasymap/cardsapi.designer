# Icons — data-driven glyphs from icon fonts

CardForge's **Icon** element renders an icon-font glyph. The glyph is chosen by
the element's *value*, so binding the element to a spreadsheet column makes the
icon **change per card** (e.g. a "type" column that turns into a fire/water/earth
symbol).

Under the hood an icon element renders:

```html
<i class="<resolved value>" style="font-size:…;color:…"></i>
```

The class string comes from the element's **tag** (a literal class, or a
`{{column}}` binding resolved against each row). Size and color come from the
element's **Font Size** and **Color** in the properties panel.

## Built-in libraries

Two libraries are loaded automatically whenever a card uses an icon element — no
setup needed:

| Library | Class syntax | Examples |
|---|---|---|
| [Font Awesome 6 Free](https://fontawesome.com/search?o=r&m=free) | `fa-solid fa-<name>` (also `fa-regular`, `fa-brands`) | `fa-solid fa-dragon`, `fa-solid fa-shield-halved`, `fa-solid fa-heart` |
| [RPG-Awesome](https://nagoshiashumari.github.io/Rpg-Awesome/) | `ra ra-<name>` | `ra ra-fire`, `ra ra-crossed-swords`, `ra ra-health` |

> Find class names in each library's gallery (linked above). RPG-Awesome always
> needs the base `ra` class **plus** the icon class: `ra ra-fire`.

### Symbol-font presets (one-click)

The Icon panel also has one-click presets for popular **symbol fonts**:

| Preset | Class syntax | Examples |
|---|---|---|
| [Mana](https://mana.andrewgioia.com/icons.html) — MTG mana/symbols | `ms ms-<sym>` (add `ms-cost` for the rounded pip) | `ms ms-g ms-cost`, `ms ms-2 ms-cost`, `ms ms-tap` |
| [Keyrune](https://keyrune.andrewgioia.com/) — MTG set symbols | `ss ss-<set>` | `ss ss-mid`, `ss ss-war` |

These load only for projects that opt in. The **Magic-style** template ships with
Mana enabled and an icon-based mana-cost field, so a `cost` column of Mana
classes renders as real pips. Any project can add them from the Icon panel, and
**templates carry their font set** — saving a project as a template preserves its
custom symbol fonts.

## Add a single (static) icon

1. In the **Add Element** palette, click **Icon**.
2. Select it, and in **Properties → Tag** type the icon class, e.g.
   `fa-solid fa-dragon` or `ra ra-fire`.
3. Position/resize it; set **Font Size** and **Color** for the glyph.

The glyph previews live on the canvas.

## Make icons change per card (data-driven)

1. Add a column to your sheet whose cells contain icon **classes** — for example
   a column named `icon`:

   ```csv
   name,type,icon
   Ember Drake,Fire,ra ra-fire
   Tide Serpent,Water,ra ra-water
   Stone Golem,Earth,ra ra-stone-pile
   ```

2. Add an **Icon** element and set its **Tag** to `{{icon}}`.
3. Each card now shows the glyph named in that row's `icon` cell.

On the **design canvas** a bound icon shows a faint ◆ placeholder (there's no row
selected there); switch to the **Preview** tab to see the real per-card glyphs.

> Tip: keep your data semantic (a `type` column of `Fire`/`Water`) **and** add a
> separate `icon` column with the class — or just store the class directly. The
> cell value must be the actual CSS class(es) applied to `<i>`.

## Add another icon library ("…and similar")

Any CSS icon font that works via `<i class="…">` can be added per project:

1. Select an **Icon** element → the **Icon** section → paste the library's CSS
   URL under "Add more icon-font CSS" and click **Add**.
2. Use that library's classes in your tags / data.

Stored on the project as `iconStylesheets` (saved in `project.json`). Examples of
compatible libraries:

- **Game-icons.net** (webfont build), **Iconify** icon-font bundles,
  **Material Symbols**, **Bootstrap Icons**, **Lucide font**, etc.

**Requirements & caveats**

- The library must be a **class-based icon font** (a stylesheet that maps
  `<i class>` to a glyph). SVG-sprite-only libraries won't work this way.
- For the **local PNG / PDF** export, the font is embedded into the image, so the
  stylesheet must be served with **CORS** enabled (the built-ins from cdnjs are).
  If a custom library isn't CORS-enabled the icon still shows in the app and the
  public gallery, but may be missing from the rasterised PNG/PDF.
- The **remote** PDF (WeasyPrint) does not currently inject icon-font CSS — use
  **local** PDF/PNG or the exported HTML for icon-font output.

## Where icons render

| Output | Icon fonts? | Notes |
|---|---|---|
| Editor canvas / Preview tab | ✅ | Preview shows per-card glyphs |
| Public gallery (`/p/:slug`) | ✅ | Loads the project's icon stylesheets |
| Exported `card_N.html` (ZIP / repo) | ✅ | Each file embeds the needed `<link>`s |
| Local **PNG** / **PDF** | ✅ | Font embedded; needs CORS for custom libs |
| Remote PDF (WeasyPrint) | ❌ | Not wired for icon fonts yet |
