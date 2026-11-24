import type { ProductOptionConfig, ProductOptionInput } from "./validations/product";

type Model = { options: ProductOptionConfig[] | null; variantSelector: string | null };

export function modelDimensions(model: Model): ProductOptionConfig[] {
  if (model.options?.length) return model.options;
  return (model.variantSelector || "Variante").split(/\s+y\s+/i).map((name, i) => ({
    id: `opt-${i + 1}`, name, type: name.toLowerCase() === "color" ? "color" : "text", values: [],
  }));
}

export function extendModelOptions(model: Model, options: ProductOptionInput[]) {
  const dimensions = modelDimensions(model).map(d => ({ ...d, values: [...d.values] }));
  for (const option of options) {
    const attrs = option.attributes ?? {};
    if (Object.keys(attrs).length !== dimensions.length || dimensions.some(d => !attrs[d.name]) ||
        (option.variantColor && !dimensions.some(d => d.type === "color"))) {
      throw new Error("Las variantes deben conservar los atributos del modelo.");
    }
    const label = dimensions.map(d => attrs[d.name].trim()).join(" / ");
    if (label.toLowerCase() !== option.variant.toLowerCase()) {
      throw new Error("La variante debe coincidir con sus atributos y su orden.");
    }
    for (const dimension of dimensions) {
      const name = attrs[dimension.name].trim();
      if (!dimension.values.some(v => v.name.toLowerCase() === name.toLowerCase())) {
        dimension.values.push({ name, ...(dimension.type === "color" && option.variantColor ? { hex: option.variantColor } : {}) });
      }
    }
  }
  return dimensions;
}
