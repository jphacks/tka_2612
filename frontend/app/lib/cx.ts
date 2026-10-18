// className をつなげる。条件に合わないとき（false・null・undefined・""）は省く
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
