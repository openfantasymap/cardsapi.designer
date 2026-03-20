export interface CardElement {
  id: string;
  type: 'text' | 'icon' | 'image' | 'hline' | 'vline' | 'svg';
  tag: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    iconName?: string;
    strokeWidth?: number;
    svgData?: string; // data URL for uploaded SVG
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
