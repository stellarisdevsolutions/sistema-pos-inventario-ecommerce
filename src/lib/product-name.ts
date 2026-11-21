export function productName(product: { name: string; variant?: string | null }) {
  return product.variant ? product.name + " — " + product.variant : product.name;
}
