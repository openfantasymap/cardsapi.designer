import { CardProject, CardTemplate, CardRow } from '@/types/card';

const GITHUB_API = 'https://api.github.com';

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

interface GitHubRepo {
  full_name: string;
  name: string;
  owner: { login: string };
  private: boolean;
  default_branch: string;
}

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
});

export const getUser = async (token: string): Promise<GitHubUser> => {
  const res = await fetch(`${GITHUB_API}/user`, { headers: headers(token) });
  if (!res.ok) throw new Error('Invalid GitHub token');
  return res.json();
};

export const listRepos = async (token: string): Promise<GitHubRepo[]> => {
  const res = await fetch(`${GITHUB_API}/user/repos?sort=updated&per_page=30`, { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to list repos');
  return res.json();
};

/** Commit or update a single file to a repo */
const putFile = async (
  token: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch?: string
) => {
  // Check if file exists to get its sha
  const existingRes = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${path}${branch ? `?ref=${branch}` : ''}`,
    { headers: headers(token) }
  );
  let sha: string | undefined;
  if (existingRes.ok) {
    const existing = await existingRes.json();
    sha = existing.sha;
  }

  const body: Record<string, string> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
  };
  if (sha) body.sha = sha;
  if (branch) body.branch = branch;

  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to save ${path}: ${err.message || res.statusText}`);
  }
  return res.json();
};

/** Convert rows to CSV string */
const rowsToCsv = (rows: CardRow[], columns: string[]): string => {
  const header = columns.join(',');
  const lines = rows.map((row) =>
    columns.map((col) => `"${(row[col] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  return [header, ...lines].join('\n');
};

/** Generate an HTML card from a template and row data */
const renderCardHtml = (template: CardTemplate, row: CardRow, index: number): string => {
  const els = template.elements
    .map((el) => {
      const tagMatch = el.tag.match(/^\{\{(.+)\}\}$/);
      const tagName = tagMatch ? tagMatch[1].trim() : null;
      const value = tagName ? row[tagName] ?? el.tag : el.tag;

      let inner = '';
      switch (el.type) {
        case 'text':
          inner = `<span style="font-size:${el.style.fontSize || 14}px;font-weight:${el.style.fontWeight || 'normal'};color:${el.style.color || '#dee2e6'}">${value}</span>`;
          break;
        case 'icon':
          inner = `<span style="font-size:${el.style.fontSize || 24}px;color:${el.style.color || '#22d3ee'}">◆</span>`;
          break;
        case 'hline':
          inner = `<div style="width:100%;height:${el.style.strokeWidth || 2}px;background:${el.style.color || '#dee2e6'}"></div>`;
          break;
        case 'vline':
          inner = `<div style="height:100%;width:${el.style.strokeWidth || 2}px;background:${el.style.color || '#dee2e6'};margin:0 auto"></div>`;
          break;
        case 'svg':
          inner = el.style.svgData ? `<img src="${el.style.svgData}" style="width:100%;height:100%;object-fit:contain"/>` : '';
          break;
      case 'image': {
        const imgUrl = el.type === 'image' && tagName && row[tagName] ? row[tagName] : el.style.imageUrl;
        inner = imgUrl ? `<img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:4px"/>` : '';
        break;
      }
      }

      return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;display:flex;align-items:center;justify-content:center">${inner}</div>`;
    })
    .join('\n      ');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Card ${index + 1}</title></head>
<body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#111">
  <div style="position:relative;width:${template.width}px;height:${template.height}px;background:${template.backgroundColor};${template.backgroundImage ? `background-image:url(${template.backgroundImage});background-size:cover;background-position:center;` : ''}overflow:hidden;border-radius:8px">
      ${els}
  </div>
</body>
</html>`;
};

/** Generate JSON-LD with TCG Schema annotations for a card */
const renderCardJsonLd = (template: CardTemplate, row: CardRow, index: number): string => {
  const TCG_CONTEXT = 'https://tcg-schema.org/core#';

  const properties: Record<string, unknown> = {};
  template.elements.forEach((el) => {
    if (!el.tcgType) return;
    const tagMatch = el.tag.match(/^\{\{(.+)\}\}$/);
    const tagName = tagMatch ? tagMatch[1].trim() : null;
    const value = tagName ? row[tagName] ?? '' : el.tag;

    // Map tcg type to a property-friendly key
    const typeKey = el.tcgType.replace('tcg:', '');
    const propKey = typeKey.charAt(0).toLowerCase() + typeKey.slice(1);

    if (el.type === 'image') {
      const imgUrl = tagName && row[tagName] ? row[tagName] : el.style.imageUrl;
      if (imgUrl) {
        properties[propKey] = { '@type': 'schema:ImageObject', 'schema:url': imgUrl };
      }
    } else {
      properties[propKey] = value;
    }
  });

  const jsonLd = {
    '@context': {
      tcg: TCG_CONTEXT,
      schema: 'https://schema.org/',
    },
    '@type': 'tcg:Card',
    '@id': `card:${index + 1}`,
    'schema:name': row['name'] || `Card ${index + 1}`,
    ...properties,
  };

  return JSON.stringify(jsonLd, null, 2);
};

/** Save a full project to a GitHub repo */
export const saveProjectToRepo = async (
  token: string,
  repo: string,
  project: CardProject,
  branch?: string
) => {
  if (!project.template) throw new Error('No template to save');

  const prefix = `cardforge/${project.name.replace(/[^a-zA-Z0-9-_]/g, '_')}`;

  // 1. Save template as JSON
  await putFile(
    token, repo,
    `${prefix}/template.json`,
    JSON.stringify(project.template, null, 2),
    `Update template for "${project.name}"`,
    branch
  );

  // 2. Save data as CSV
  const columns = project.template.elements
    .map((el) => el.tag.match(/^\{\{(.+)\}\}$/)?.[1]?.trim())
    .filter(Boolean) as string[];

  if (project.rows.length > 0 && columns.length > 0) {
    await putFile(
      token, repo,
      `${prefix}/data.csv`,
      rowsToCsv(project.rows, columns),
      `Update data for "${project.name}"`,
      branch
    );
  }

  // 3. Save each card as HTML + JSON-LD
  const hasTcgAnnotations = project.template.elements.some((el) => el.tcgType);

  for (let i = 0; i < project.rows.length; i++) {
    const html = renderCardHtml(project.template, project.rows[i], i);
    await putFile(
      token, repo,
      `${prefix}/cards/card_${String(i + 1).padStart(3, '0')}.html`,
      html,
      `Update card ${i + 1} for "${project.name}"`,
      branch
    );

    // JSON-LD only if at least one element has a TCG type
    if (hasTcgAnnotations) {
      const jsonLd = renderCardJsonLd(project.template, project.rows[i], i);
      await putFile(
        token, repo,
        `${prefix}/cards/card_${String(i + 1).padStart(3, '0')}.jsonld`,
        jsonLd,
        `Update card ${i + 1} JSON-LD for "${project.name}"`,
        branch
      );
    }
  }

  const jsonLdCount = hasTcgAnnotations ? project.rows.length : 0;
  return { path: prefix, fileCount: 2 + project.rows.length + jsonLdCount };
};
