export type Vec2 = [number, number];

export type Cocktail = {
  id: number;
  name: string;
  base: string;
  abv: number;
  description: string;
  tags: string[];
  // 名前や特徴から作った高次元の特徴量ベクトル（長さ 1）
  embedding: number[];
};
