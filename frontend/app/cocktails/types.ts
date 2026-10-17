export type Vec2 = [number, number];

export type Cocktail = {
  id: number;
  name: string;
  base: string;
  abv: number;
  description: string;
  tags: string[];
  // 高次元の特徴量ベクトルを2次元に圧縮した座標
  vector: Vec2;
};
