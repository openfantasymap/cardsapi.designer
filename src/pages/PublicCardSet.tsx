import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectStore } from '@/store/useProjectStore';
import { renderElement } from '@/components/CardCanvas';
import { loadGoogleFonts } from '@/lib/fonts';
import { loadStylesheets, templateHasIcons, iconCssUrls, MANA_CSS } from '@/lib/icons';
import { usesManaTokens } from '@/lib/mana';
import { CardTemplate, CardRow, CardElement, TCG_SCHEMA_PROPERTIES } from '@/types/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, RotateCcw } from 'lucide-react';

/** Resolve a TCG URI to a full URL for microdata */
const tcgUri = (uri: string): string => {
  if (uri.startsWith('schema:')) return `https://schema.org/${uri.slice(7)}`;
  if (uri.startsWith('tcg:')) return `https://tcg-schema.org/core#${uri.slice(4)}`;
  return uri;
};

/** Render a single card face with microdata annotations */
const CardFaceRender = ({
  template,
  row,
  scale,
  isFace,
  assets,
}: {
  template: CardTemplate;
  row: CardRow;
  scale: number;
  isFace?: 'front' | 'back';
  assets?: Record<string, string>;
}) => {
  const faceProps: Record<string, string> = {};
  if (isFace) {
    faceProps.itemScope = '';
    faceProps.itemType = tcgUri('tcg:CardFace');
  }

  return (
    <div
      className="relative origin-top-left shrink-0"
      style={{
        width: template.width,
        height: template.height,
        backgroundColor: template.backgroundColor,
        backgroundImage: template.backgroundImage ? `url(${assets?.[template.backgroundImage] ?? template.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transform: `scale(${scale})`,
      }}
      {...faceProps}
    >
      {isFace && (
        <meta itemProp={tcgUri(isFace === 'front' ? 'tcg:faceName' : 'tcg:faceName')} content={isFace} />
      )}
      {template.elements.map((el) => {
        if (el.visibleIfField) {
          const fieldVal = row[el.visibleIfField];
          if (!fieldVal || fieldVal.trim() === '') return null;
        }
        const tagMatch = el.tag.match(/^\{\{(.+)\}\}$/);
        const tagName = tagMatch ? tagMatch[1].trim() : null;
        const value = tagName ? row[tagName] ?? el.tag : undefined;

        // Build microdata props
        const elProps: Record<string, string> = {};
        if (el.tcgProperty) {
          elProps.itemProp = tcgUri(el.tcgProperty);
        }
        if (el.tcgType) {
          elProps.itemScope = '';
          elProps.itemType = tcgUri(el.tcgType);
        }

        return (
          <div
            key={el.id}
            className="absolute"
            style={{
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
              transform: el.style.rotation ? `rotate(${el.style.rotation}deg)` : undefined,
            }}
            {...elProps}
          >
            {renderElement(el, value, assets)}
          </div>
        );
      })}
    </div>
  );
};

/** Single card with flip capability */
const PublicCard = ({
  row,
  index,
  frontTemplate,
  backTemplate,
  scale,
  extraColumns,
  assets,
}: {
  row: CardRow;
  index: number;
  frontTemplate: CardTemplate;
  backTemplate?: CardTemplate;
  scale: number;
  extraColumns: string[];
  assets?: Record<string, string>;
}) => {
  const [flipped, setFlipped] = useState(false);
  const hasBack = !!backTemplate;
  const activeTemplate = flipped && backTemplate ? backTemplate : frontTemplate;
  const activeFace = flipped ? 'back' : 'front';

  // Find the name field from tcg annotations or first column
  const nameEl = frontTemplate.elements.find(
    (el) => el.tcgProperty === 'schema:name'
  );
  const nameTag = nameEl?.tag.match(/^\{\{(.+)\}\}$/)?.[1]?.trim();
  const cardName = nameTag ? row[nameTag] : row[Object.keys(row)[0]] || `Card ${index + 1}`;

  return (
    <article
      className="bg-card border border-border rounded-lg overflow-hidden"
      itemScope
      itemType={tcgUri('tcg:Card')}
    >
      <meta itemProp={tcgUri('schema:name')} content={cardName} />

      {/* Card visual */}
      <div
        className="relative cursor-pointer overflow-hidden"
        style={{
          width: activeTemplate.width * scale,
          height: activeTemplate.height * scale,
        }}
        onClick={() => hasBack && setFlipped(!flipped)}
        title={hasBack ? 'Click to flip' : undefined}
      >
        <CardFaceRender
          template={activeTemplate}
          row={row}
          scale={scale}
          isFace={hasBack ? activeFace : undefined}
          assets={assets}
        />
        {hasBack && (
          <div className="absolute top-1.5 right-1.5 bg-background/70 rounded-full p-1">
            <RotateCcw size={10} className="text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Extra metadata (description, etc.) */}
      {extraColumns.length > 0 && (
        <div className="p-3 border-t border-border space-y-1">
          {extraColumns.map((col) => {
            const val = row[col];
            if (!val || val.trim() === '') return null;

            // Try to map column name to a TCG property for microdata
            const tcgProp = TCG_SCHEMA_PROPERTIES.find(
              (p) => p.label.toLowerCase() === col.toLowerCase() || p.uri.split(':')[1] === col
            );

            return (
              <div key={col} className="text-xs">
                <span className="text-muted-foreground font-display">{col}: </span>
                <span
                  className="text-foreground"
                  {...(tcgProp ? { itemProp: tcgUri(tcgProp.uri) } : {})}
                >
                  {val}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
};

export const PublicCardSet = () => {
  const { slug } = useParams<{ slug: string }>();
  const project = useProjectStore((s) => s.projects.find((p) => p.slug === slug));
  const [search, setSearch] = useState('');

  // Load any Google Fonts used by the project so the gallery renders correctly.
  useEffect(() => {
    if (!project) return;
    const fams = project.sheets.flatMap((sh) => [
      ...sh.template.elements.map((el) => el.style.fontFamily),
      ...(sh.backTemplate?.elements ?? []).map((el) => el.style.fontFamily),
    ]);
    loadGoogleFonts(fams);
    const usesIcons = project.sheets.some((sh) => templateHasIcons(sh.template) || templateHasIcons(sh.backTemplate));
    if (usesIcons) loadStylesheets(iconCssUrls(project.iconStylesheets));
    const usesMana = project.sheets.some(
      (sh) => usesManaTokens(sh.template, sh.rows) || (sh.backTemplate && usesManaTokens(sh.backTemplate, sh.rows)),
    );
    if (usesMana) loadStylesheets([MANA_CSS]);
  }, [project]);

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">Project not found</p>
          <Link to="/" className="text-primary text-sm hover:underline mt-2 inline-block">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  if (!project.isPublic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">This project is not public</p>
          <Link to="/" className="text-primary text-sm hover:underline mt-2 inline-block">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const scale = 0.5;

  return (
    <div
      className="min-h-screen bg-background"
      itemScope
      itemType={tcgUri('tcg:CardSet')}
    >
      <meta itemProp={tcgUri('schema:name')} content={project.name} />
      {project.description && (
        <meta itemProp={tcgUri('schema:description')} content={project.description} />
      )}

      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground font-display" itemProp={tcgUri('schema:name')}>
              {project.name}
            </h1>
            {project.description && (
              <p className="text-muted-foreground text-sm mt-0.5">{project.description}</p>
            )}
          </div>
          <div className="relative w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search cards…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs h-8 pl-8"
            />
          </div>
        </div>
      </header>

      {/* Sheets / card galleries */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {project.sheets.map((sheet) => {
          const tagColumns = sheet.template.elements
            .map((el) => el.tag.match(/^\{\{(.+)\}\}$/)?.[1]?.trim())
            .filter((c): c is string => c !== null);

          const backTagColumns = (sheet.backTemplate?.elements ?? [])
            .map((el) => el.tag.match(/^\{\{(.+)\}\}$/)?.[1]?.trim())
            .filter((c): c is string => c !== null);

          const allTagCols = new Set([...tagColumns, ...backTagColumns]);

          const allDataColumns = Array.from(
            new Set(sheet.rows.flatMap((r) => Object.keys(r)))
          );

          const extraColumns = allDataColumns.filter((c) => !allTagCols.has(c));

          const lowerSearch = search.toLowerCase();
          const filteredRows = search
            ? sheet.rows.filter((row) =>
                Object.values(row).some((v) => v.toLowerCase().includes(lowerSearch))
              )
            : sheet.rows;

          if (filteredRows.length === 0 && search) return null;

          return (
            <section key={sheet.id}>
              {project.sheets.length > 1 && (
                <h2 className="font-display text-sm font-semibold text-foreground mb-4">
                  {sheet.name} ({filteredRows.length})
                </h2>
              )}
              <div className="flex flex-wrap gap-4">
                {filteredRows.map((row, i) => (
                  <PublicCard
                    key={i}
                    row={row}
                    index={i}
                    frontTemplate={sheet.template}
                    backTemplate={sheet.backTemplate}
                    scale={scale}
                    extraColumns={extraColumns}
                    assets={project.assets}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
};
