export const decimalTransformer = {
  to: (value: number | null) =>
    value != null ? Math.round(value * 100) : null,
  from: (value: number | null) => (value != null ? value / 100 : null),
};
