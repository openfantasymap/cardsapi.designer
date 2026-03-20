export interface CardElement {
  id: string;
  type: 'text' | 'icon' | 'image';
  tag: string; // template tag name e.g. "{{name}}"
  x: number;
  y: number;
  width: number;
  height: number;
  style: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    iconName?: string;
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

export interface CardProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  template: CardTemplate | null;
}
