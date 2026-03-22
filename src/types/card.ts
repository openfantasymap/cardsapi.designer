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

/** TCG Schema properties grouped by the class they typically belong to */
export const TCG_SCHEMA_PROPERTIES = [
  { uri: 'schema:name', label: 'Name', domain: 'tcg:Card' },
  { uri: 'schema:description', label: 'Description', domain: 'tcg:Card' },
  { uri: 'tcg:hasMechanic', label: 'Mechanic', domain: 'tcg:Card' },
  { uri: 'tcg:hasRole', label: 'Role', domain: 'tcg:Card' },
  { uri: 'tcg:hasAbility', label: 'Ability', domain: 'tcg:Card' },
  { uri: 'tcg:primaryCost', label: 'Primary Cost', domain: 'tcg:Card' },
  { uri: 'tcg:altCost', label: 'Alt Cost', domain: 'tcg:Card' },
  { uri: 'tcg:usesCounterType', label: 'Counter Type', domain: 'tcg:Card' },
  { uri: 'tcg:faceName', label: 'Face Name', domain: 'tcg:CardFace' },
  { uri: 'tcg:faceText', label: 'Face Text', domain: 'tcg:CardFace' },
  { uri: 'tcg:collectorNumber', label: 'Collector #', domain: 'tcg:CardPrinting' },
  { uri: 'tcg:rarity', label: 'Rarity', domain: 'tcg:CardPrinting' },
  { uri: 'tcg:language', label: 'Language', domain: 'tcg:CardPrinting' },
  { uri: 'tcg:finish', label: 'Finish', domain: 'tcg:CardPrinting' },
  { uri: 'tcg:isFoil', label: 'Is Foil', domain: 'tcg:CardPrinting' },
  { uri: 'tcg:artwork', label: 'Artwork', domain: 'tcg:CardPrinting' },
  { uri: 'tcg:artist', label: 'Artist', domain: 'tcg:CardPrinting' },
  { uri: 'tcg:setCode', label: 'Set Code', domain: 'tcg:CardSet' },
  { uri: 'tcg:setType', label: 'Set Type', domain: 'tcg:CardSet' },
  { uri: 'tcg:abilityText', label: 'Ability Text', domain: 'tcg:Ability' },
  { uri: 'tcg:abilityType', label: 'Ability Type', domain: 'tcg:Ability' },
  { uri: 'tcg:costText', label: 'Cost Text', domain: 'tcg:ResourceCost' },
  { uri: 'tcg:costKind', label: 'Cost Kind', domain: 'tcg:ResourceCost' },
  { uri: 'tcg:status', label: 'Status', domain: 'tcg:Legality' },
  { uri: 'tcg:notes', label: 'Notes', domain: '__any__' },
  { uri: 'tcg:source', label: 'Source URL', domain: '__any__' },
] as const;

export type TcgSchemaClass = typeof TCG_SCHEMA_CLASSES[number]['uri'] | '';
export type TcgSchemaProperty = typeof TCG_SCHEMA_PROPERTIES[number]['uri'] | '';

export interface CardElement {
  id: string;
  type: 'text' | 'icon' | 'image' | 'hline' | 'vline' | 'svg';
  tag: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visibleIfField?: string;
  tcgType?: TcgSchemaClass;
  tcgProperty?: TcgSchemaProperty;
  style: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    iconName?: string;
    strokeWidth?: number;
    svgData?: string;
    imageUrl?: string;
    rotation?: number;
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

/** A sheet pairs a template with its data rows */
export interface CardSheet {
  id: string;
  name: string;
  template: CardTemplate;
  rows: CardRow[];
}

export interface CardProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  sheets: CardSheet[];
}
