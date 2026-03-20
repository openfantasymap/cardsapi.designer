/** TCG Schema class URIs relevant for card element annotation */
export const TCG_SCHEMA_CLASSES = [
  { uri: 'tcg:Card', label: 'Card', description: 'Abstract card identity' },
  { uri: 'tcg:CardFace', label: 'Card Face', description: 'A face/part of a card' },
  { uri: 'tcg:CardPrinting', label: 'Card Printing', description: 'Specific printing/variant' },
  { uri: 'tcg:CardSet', label: 'Card Set', description: 'Set/expansion' },
  { uri: 'tcg:Ability', label: 'Ability', description: 'Card ability' },
  { uri: 'tcg:Effect', label: 'Effect', description: 'Effect of an ability' },
  { uri: 'tcg:Mechanic', label: 'Mechanic', description: 'Named mechanic/keyword' },
  { uri: 'tcg:Role', label: 'Role', description: 'Functional role in deckbuilding' },
  { uri: 'tcg:ResourceCost', label: 'Resource Cost', description: 'Cost in a resource system' },
  { uri: 'tcg:Format', label: 'Format', description: 'Game format' },
  { uri: 'tcg:Legality', label: 'Legality', description: 'Legality status' },
  { uri: 'tcg:CounterType', label: 'Counter Type', description: 'Counter as game object' },
  { uri: 'tcg:Deck', label: 'Deck', description: 'Deck of cards' },
] as const;

export type TcgSchemaClass = typeof TCG_SCHEMA_CLASSES[number]['uri'] | '';

export interface CardElement {
  id: string;
  type: 'text' | 'icon' | 'image' | 'hline' | 'vline' | 'svg';
  tag: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tcgType?: TcgSchemaClass;
  style: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    iconName?: string;
    strokeWidth?: number;
    svgData?: string;
    imageUrl?: string;
  };
}

export interface CardTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundImage?: string;
  backgroundColor: string;
  elements: CardElement[];
}

export type CardRow = Record<string, string>;

export interface CardProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  template: CardTemplate | null;
  rows: CardRow[];
}
