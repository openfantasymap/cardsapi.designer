/**
 * Prebuilt starter templates for common TCG layouts.
 *
 * These are **generic, homebrew-friendly** structural layouts ("…-style") — the
 * element placement and bound columns that each game's cards tend to use. They
 * contain no logos, official art, or trademarked assets; they're just a starting
 * point you customise. Each preset builds a CardTemplate (with elements bound to
 * `{{columns}}`) plus a sample row so the preview shows something immediately.
 */
import { CardTemplate, CardElement, CardRow } from '@/types/card';
import { MANA_CSS } from '@/lib/icons';

const W = 375;
const H = 525; // 2.5" × 3.5" @ 150dpi

const gid = () => Math.random().toString(36).slice(2, 10);

const el = (
  type: CardElement['type'],
  tag: string,
  x: number,
  y: number,
  width: number,
  height: number,
  style: CardElement['style'] = {},
): CardElement => ({ id: gid(), type, tag, x, y, width, height, style });

const template = (name: string, backgroundColor: string, elements: CardElement[]): CardTemplate => ({
  id: gid(),
  name,
  width: W,
  height: H,
  backgroundColor,
  elements,
});

export interface CardPreset {
  id: string;
  label: string;
  description: string;
  build: () => { template: CardTemplate; rows: CardRow[]; iconStylesheets?: string[] };
}

// ── Blank ────────────────────────────────────────────────────────────────────

const blank: CardPreset = {
  id: 'blank',
  label: 'Blank',
  description: 'An empty card to design from scratch.',
  build: () => ({
    template: { id: gid(), name: 'Card', width: 350, height: 490, backgroundColor: 'hsl(220 18% 13%)', elements: [] },
    rows: [],
  }),
};

// ── Magic-style ──────────────────────────────────────────────────────────────

const magic: CardPreset = {
  id: 'magic',
  label: 'Magic-style',
  description: 'Name, mana symbols (Mana font), art, type line, rules box, P/T.',
  build: () => ({
    template: template('Magic-style', '#d9c9a3', [
      el('text', '{{name}}', 18, 14, 230, 28, { fontSize: 20, fontWeight: 'bold', color: '#15110a' }),
      // Mana cost as a symbol via the Mana icon font (bind the column to mana classes).
      el('icon', '{{cost}}', 286, 14, 74, 26, { fontSize: 22, color: '#15110a', textAlign: 'right' }),
      el('image', '{{art}}', 16, 50, 343, 215, { borderWidth: 2, borderColor: '#15110a' }),
      el('text', '{{type}}', 18, 274, 343, 24, { fontSize: 14, fontWeight: 'bold', color: '#15110a' }),
      el('text', '{{text}}', 22, 306, 331, 158, { fontSize: 13, color: '#1a1308', backgroundColor: '#efe6cf', borderRadius: 4 }),
      el('text', '{{pt}}', 286, 474, 74, 34, { fontSize: 18, fontWeight: 'bold', color: '#15110a', textAlign: 'right', backgroundColor: '#efe6cf', borderRadius: 4 }),
      el('text', '{{set}}', 18, 492, 200, 16, { fontSize: 9, color: '#4a3a1a' }),
    ]),
    rows: [
      { name: 'Grizzly Bears', cost: 'ms ms-1 ms-cost', type: 'Creature — Bear', text: 'A reliable 2/2 for two mana. Set the cost column to Mana classes like "ms ms-2 ms-cost".', pt: '2 / 2', set: 'HOME • C', art: '' },
    ],
    iconStylesheets: [MANA_CSS],
  }),
};

// ── Pokémon-style ────────────────────────────────────────────────────────────

const pokemon: CardPreset = {
  id: 'pokemon',
  label: 'Pokémon-style',
  description: 'Name + HP, big art, one attack with damage, footer stats.',
  build: () => ({
    template: template('Pokémon-style', '#f7d774', [
      el('text', '{{name}}', 18, 16, 210, 26, { fontSize: 20, fontWeight: 'bold', color: '#222' }),
      el('text', 'HP', 248, 20, 28, 20, { fontSize: 11, fontWeight: 'bold', color: '#c0392b', textAlign: 'right' }),
      el('text', '{{hp}}', 278, 16, 82, 26, { fontSize: 20, fontWeight: 'bold', color: '#c0392b', textAlign: 'right' }),
      el('text', '{{stage}}', 18, 46, 343, 16, { fontSize: 11, color: '#6b5a20' }),
      el('image', '{{art}}', 22, 66, 331, 184, { borderWidth: 3, borderColor: '#caa83a' }),
      el('text', '{{attack}}', 22, 262, 230, 24, { fontSize: 16, fontWeight: 'bold', color: '#222' }),
      el('text', '{{damage}}', 300, 262, 58, 24, { fontSize: 18, fontWeight: 'bold', color: '#222', textAlign: 'right' }),
      el('text', '{{attacktext}}', 22, 290, 336, 120, { fontSize: 12, color: '#333' }),
      el('text', '{{weakness}}', 22, 472, 110, 18, { fontSize: 10, color: '#444' }),
      el('text', '{{resistance}}', 138, 472, 110, 18, { fontSize: 10, color: '#444' }),
      el('text', '{{retreat}}', 254, 472, 104, 18, { fontSize: 10, color: '#444', textAlign: 'right' }),
    ]),
    rows: [
      {
        name: 'Sparkmouse', hp: '60', stage: 'Basic', attack: 'Quick Spark', damage: '20',
        attacktext: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.',
        weakness: 'Weakness: Fighting', resistance: 'Resistance: —', retreat: 'Retreat: ●', art: '',
      },
    ],
  }),
};

// ── Yu-Gi-Oh!-style ──────────────────────────────────────────────────────────

const yugioh: CardPreset = {
  id: 'yugioh',
  label: 'Yu-Gi-Oh!-style',
  description: 'Name + attribute, level row, art, type line, effect box, ATK/DEF.',
  build: () => ({
    template: template('Yu-Gi-Oh!-style', '#c69a5b', [
      el('text', '{{name}}', 18, 14, 270, 26, { fontSize: 19, fontWeight: 'bold', color: '#2a1a0a' }),
      el('text', '{{attribute}}', 312, 12, 48, 30, { fontSize: 12, fontWeight: 'bold', color: '#f0e6d2', textAlign: 'center', backgroundColor: '#2a1a0a', borderRadius: 15 }),
      el('text', '{{level}}', 18, 44, 343, 22, { fontSize: 15, color: '#7a4a14', textAlign: 'right' }),
      el('image', '{{art}}', 30, 72, 315, 200, { borderWidth: 2, borderColor: '#2a1a0a' }),
      el('text', '{{type}}', 18, 278, 343, 20, { fontSize: 12, fontWeight: 'bold', color: '#2a1a0a' }),
      el('text', '{{effect}}', 18, 302, 343, 150, { fontSize: 12, color: '#1a120a', backgroundColor: '#efe2c6', borderRadius: 3 }),
      el('text', 'ATK', 150, 472, 40, 22, { fontSize: 12, fontWeight: 'bold', color: '#2a1a0a' }),
      el('text', '{{atk}}', 192, 472, 78, 22, { fontSize: 14, fontWeight: 'bold', color: '#2a1a0a', textAlign: 'right' }),
      el('text', 'DEF', 276, 472, 40, 22, { fontSize: 12, fontWeight: 'bold', color: '#2a1a0a' }),
      el('text', '{{def}}', 318, 472, 42, 22, { fontSize: 14, fontWeight: 'bold', color: '#2a1a0a', textAlign: 'right' }),
    ]),
    rows: [
      {
        name: 'Cinder Imp', attribute: 'FIRE', level: '★★★', type: '[Fiend / Effect]',
        effect: 'Once per turn: you can inflict 300 damage to your opponent.',
        atk: '1200', def: '800', art: '',
      },
    ],
  }),
};

// ── Hearthstone-style ────────────────────────────────────────────────────────

const hearthstone: CardPreset = {
  id: 'hearthstone',
  label: 'Hearthstone-style',
  description: 'Mana gem, big art, name banner, text box, attack & health gems.',
  build: () => ({
    template: template('Hearthstone-style', '#2f2417', [
      el('text', '{{cost}}', 12, 12, 56, 56, { fontSize: 30, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', backgroundColor: '#2a6fb0', borderRadius: 28 }),
      el('image', '{{art}}', 60, 40, 255, 210, { borderRadius: 14, borderWidth: 3, borderColor: '#caa24a' }),
      el('text', '{{name}}', 40, 250, 295, 36, { fontSize: 19, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', backgroundColor: '#5a3a1a', borderRadius: 8 }),
      el('text', '{{type}}', 40, 290, 295, 16, { fontSize: 11, color: '#caa24a', textAlign: 'center' }),
      el('text', '{{text}}', 52, 312, 271, 120, { fontSize: 13, color: '#f0e6d2', textAlign: 'center' }),
      el('text', '{{attack}}', 14, 455, 56, 56, { fontSize: 28, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', backgroundColor: '#b8902a', borderRadius: 28 }),
      el('text', '{{health}}', 305, 455, 56, 56, { fontSize: 28, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', backgroundColor: '#a8331f', borderRadius: 28 }),
    ]),
    rows: [
      { cost: '3', name: 'Emberling', type: 'Minion — Elemental', text: 'Battlecry: deal 1 damage to all enemies.', attack: '3', health: '2', art: '' },
    ],
  }),
};

export const CARD_PRESETS: CardPreset[] = [blank, magic, pokemon, yugioh, hearthstone];
