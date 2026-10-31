export interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  discount?: string;
  category: "Smartphones" | "Laptops" | "Audífonos" | "Smartwatches" | "Gaming" | "Accesorios";
  brand: string;
  rating: number;
  reviews: number;
  image: string;
  images: string[];
  description: string;
  features: string[];
  specs: Record<string, string>;
  stock: number;
  isFlashOffer?: boolean;
  isFeatured?: boolean;
  colors?: { name: string; hex: string }[];
  variants?: string[];
}

export const PRODUCTS_CATALOG: Product[] = [
  {
    id: 1,
    name: "GadgetHub Watch X1 Pro Amoled",
    slug: "gadgethub-watch-x1-pro",
    price: 149.99,
    originalPrice: 199.99,
    discount: "-25%",
    category: "Smartwatches",
    brand: "GadgetHub",
    rating: 5,
    reviews: 128,
    image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80",
    ],
    description:
      "El GadgetHub Watch X1 Pro combina sofisticación y potencia en tu muñeca. Equipado con una brillante pantalla AMOLED de 1.43 pulgadas siempre activa, sensores biométricos de última generación y más de 120 modos deportivos.",
    features: [
      "Pantalla Ultra Retina AMOLED de 1.43'' con Always-On Display",
      "Monitoreo continuo de frecuencia cardíaca, SpO2 y estrés 24/7",
      "Batería de larga duración de hasta 14 días con una sola carga",
      "Resistencia al agua 5 ATM apto para natación",
      "Llamadas Bluetooth nítidas con micrófono dual cancelador de ruido",
    ],
    specs: {
      "Pantalla": "1.43'' AMOLED (466 x 466 px)",
      "Autonomía": "Hasta 14 días de uso típico",
      "Conectividad": "Bluetooth 5.3 BLE + GPS dual integrado",
      "Compatibilidad": "Android 8.0+ / iOS 12.0+",
      "Material": "Cuerpo de aluminio aeroespacial y cristal de zafiro",
      "Garantía": "12 Meses de Garantía Oficial",
    },
    stock: 24,
    isFlashOffer: true,
    isFeatured: true,
    colors: [
      { name: "Negro Obsidiana", hex: "#1e293b" },
      { name: "Plata Titanio", hex: "#94a3b8" },
      { name: "Naranja Deportivo", hex: "#ff5500" },
    ],
    variants: ["42 mm", "46 mm"],
  },
  {
    id: 2,
    name: "SoundCore Elite Earbuds Pro Studio",
    slug: "soundcore-elite-earbuds-pro",
    price: 79.99,
    originalPrice: 99.99,
    discount: "-20%",
    category: "Audífonos",
    brand: "SoundCore",
    rating: 5,
    reviews: 96,
    image: "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=600&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&auto=format&fit=crop&q=80",
    ],
    description:
      "Sumérgete en una fidelidad de audio cristalina con cancelación activa de ruido híbrida de 42dB. Diseñados con diafragmas de biocelulosa de 11mm para unos graves profundos y agudos precisos.",
    features: [
      "Cancelación de Ruido Activa Adaptativa (ANC) hasta -42dB",
      "Modo Transparencia Inteligente para escuchar tu entorno con claridad",
      "Hasta 36 horas de reproducción total con estuche de carga USB-C",
      "Carga rápida: 10 minutos de carga brindan 2 horas de música",
      "Certificación IPX5 resistente al sudor y lluvia",
    ],
    specs: {
      "Drivers": "Diafragmas de 11 mm Biocelulosa Hi-Res",
      "Autonomía": "8h auriculares + 28h estuche (Total 36h)",
      "Cancelación": "Híbrida ANC con 6 micrófonos beamforming",
      "Códecs": "LDAC, AAC, SBC",
      "Conexión": "Bluetooth 5.3 Multipunto (2 dispositivos)",
      "Garantía": "12 Meses",
    },
    stock: 38,
    isFlashOffer: true,
    isFeatured: true,
    colors: [
      { name: "Negro Mate", hex: "#0f172a" },
      { name: "Blanco Glaciar", hex: "#f8fafc" },
    ],
  },
  {
    id: 3,
    name: "Pulse X Parlante Bluetooth 360° Waterproof",
    slug: "pulse-x-parlante-bluetooth",
    price: 49.99,
    originalPrice: 65.00,
    discount: "-15%",
    category: "Audífonos",
    brand: "Pulse Audio",
    rating: 5,
    reviews: 64,
    image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop&q=80",
    ],
    description:
      "Potencia sónica envolvente de 30W en un diseño cilíndrico ultra resistente. Lleva tu música a la playa, piscina o montaña gracias a su certificación impermeable IPX7.",
    features: [
      "Sonido estéreo 360° con radiadores pasivos de bajo profundo",
      "Certificación IPX7 totalmente sumergible",
      "Función PartyCast: enlaza hasta 100 parlantes en simultáneo",
      "Batería recargable para 18 horas de fiesta ininterrumpida",
    ],
    specs: {
      "Potencia": "30W RMS SoundBoost",
      "Batería": "5200 mAh (18 horas de uso)",
      "Protección": "IPX7 resistente a inmersión en agua",
      "Conectividad": "Bluetooth 5.2 / Entrada AUX 3.5mm",
      "Garantía": "6 Meses",
    },
    stock: 19,
    isFlashOffer: false,
    isFeatured: false,
    colors: [
      { name: "Negro Táctico", hex: "#1e293b" },
      { name: "Azul Océano", hex: "#1e40af" },
      { name: "Rojo Fuego", hex: "#dc2626" },
    ],
  },
  {
    id: 4,
    name: "Teclado Mecánico RGB Switch Red Pro",
    slug: "teclado-mecanico-rgb-switch-red",
    price: 89.99,
    originalPrice: 110.00,
    discount: "-18%",
    category: "Gaming",
    brand: "HyperTech",
    rating: 5,
    reviews: 82,
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=80",
    ],
    description:
      "Teclado mecánico para entusiastas del gaming y la productividad con formato 75% compacto, switches rojos lubricados de fábrica y retroiluminación RGB por tecla programable.",
    features: [
      "Switches mecánicos Red lineales ultrasuaves y silenciosos",
      "Placa Hot-Swappable compatible con switches de 3 y 5 pines",
      "Estructura Gasket Mount con espumas insonorizadoras de Poron",
      "Teclas PBT Double-Shot resistentes al desgaste y al brillo",
      "Conexión Trimodo: Cable USB-C desmontable, 2.4GHz y Bluetooth",
    ],
    specs: {
      "Formato": "75% compacto (82 teclas + perilla de volumen)",
      "Switches": "Linear Red Pro pre-lubricados (50M clics)",
      "Iluminación": "RGB 16.8M colores con 22 efectos dinámicos",
      "Batería": "4000 mAh recargable",
      "Compatibilidad": "Windows, macOS, Linux",
      "Garantía": "12 Meses",
    },
    stock: 28,
    isFlashOffer: true,
    isFeatured: true,
    colors: [
      { name: "Negro Carbono", hex: "#0f172a" },
      { name: "Blanco Retro", hex: "#e2e8f0" },
    ],
  },
  {
    id: 5,
    name: "Base de Carga Rápida Inalámbrica 15W Qi",
    slug: "base-carga-rapida-inalambrica-15w",
    price: 29.99,
    originalPrice: 39.99,
    discount: "-25%",
    category: "Accesorios",
    brand: "AnkerTech",
    rating: 5,
    reviews: 40,
    image: "https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=600&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=800&auto=format&fit=crop&q=80",
    ],
    description:
      "Estación de carga inalámbrica magnética delgada fabricada en aleación de aluminio. Carga tu smartphone o auriculares sin enredos de cables y con control térmico inteligente.",
    features: [
      "Carga rápida Qi de 15W máxima compatible con iPhone y Android",
      "Acabado premium antideslizante con disipación pasiva de calor",
      "Chip de seguridad contra sobretensiones y cortocircuitos",
      "Diseño ultra delgado de solo 6.5 mm de grosor",
    ],
    specs: {
      "Potencia": "5W / 7.5W / 10W / 15W inteligente",
      "Puerto": "USB Tipo C (incluye cable trenzado de 1.2m)",
      "Certificaciones": "Qi Certified, CE, FCC, RoHS",
      "Garantía": "12 Meses",
    },
    stock: 45,
    isFlashOffer: false,
    isFeatured: false,
    colors: [
      { name: "Gris Espacial", hex: "#334155" },
      { name: "Plata", hex: "#cbd5e1" },
    ],
  },
  {
    id: 6,
    name: "Cámara de Acción 4K 60FPS Sumergible",
    slug: "camara-accion-4k-sumergible",
    price: 129.99,
    originalPrice: 159.99,
    discount: "-19%",
    category: "Accesorios",
    brand: "GoVision",
    rating: 5,
    reviews: 112,
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80",
    ],
    description:
      "Captura tus aventuras más extremas en gloriosa resolución 4K a 60 cuadros por segundo con estabilización giroscópica de 6 ejes HyperSmooth y doble pantalla color.",
    features: [
      "Grabación de video en 4K Ultra HD a 60 fps y fotos de 20MP",
      "Estabilización electrónica EIS 3.0 contra vibraciones extremas",
      "Carcasa hermética resistente hasta 40 metros bajo el agua",
      "Pantalla frontal táctil para selfies y vlogging cómodo",
      "Incluye kit de 12 accesorios de montaje universales",
    ],
    specs: {
      "Sensor": "Sony CMOS 20 Megapíxeles",
      "Lente": "Gran angular de 170° con corrección de distorsión",
      "Pantalla": "2.0'' trasera táctil + 1.4'' frontal",
      "Conectividad": "Wi-Fi integrado para control y descarga móvil",
      "Batería": "2 baterías de 1350 mAh incluidas",
      "Garantía": "12 Meses",
    },
    stock: 14,
    isFlashOffer: false,
    isFeatured: false,
    colors: [{ name: "Negro Mate", hex: "#0f172a" }],
  },
  {
    id: 7,
    name: "MacBook Air M3 Pantalla Retina 13.6 Pulgadas",
    slug: "macbook-air-m3-13",
    price: 1199.00,
    originalPrice: 1349.00,
    discount: "-11%",
    category: "Laptops",
    brand: "Apple",
    rating: 5,
    reviews: 142,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80",
    ],
    description:
      "Increíblemente delgada y rápida. La nueva MacBook Air con el chip M3 ofrece un rendimiento descomunal para tareas intensivas, inteligencia artificial y hasta 18 horas de batería.",
    features: [
      "Chip M3 de Apple con CPU de 8 núcleos y GPU de 10 núcleos",
      "Pantalla Liquid Retina de 13.6'' con 500 nits de brillo y True Tone",
      "16GB de memoria unificada de alta velocidad y 512GB SSD ultra rápido",
      "Cámara FaceTime HD de 1080p con micrófonos de calidad estudio",
      "Diseño sin ventilador totalmente silencioso con puerto MagSafe 3",
    ],
    specs: {
      "Procesador": "Apple M3 (8 núcleos CPU, 10 núcleos GPU)",
      "Memoria RAM": "16 GB Unificada",
      "Almacenamiento": "512 GB SSD NVMe",
      "Pantalla": "13.6'' Liquid Retina (2560 x 1664 px)",
      "Peso": "1.24 kg ultraligero",
      "Garantía": "12 Meses Apple Oficial",
    },
    stock: 8,
    isFlashOffer: false,
    isFeatured: true,
    colors: [
      { name: "Medianoche", hex: "#1e293b" },
      { name: "Blanco Estelar", hex: "#f1f5f9" },
      { name: "Gris Espacial", hex: "#475569" },
    ],
    variants: ["256 GB SSD", "512 GB SSD", "1 TB SSD"],
  },
  {
    id: 8,
    name: "Mouse Gamer Ergonómico RGB 16000 DPI",
    slug: "mouse-gamer-rgb-16000-dpi",
    price: 39.99,
    originalPrice: 49.99,
    discount: "-20%",
    category: "Gaming",
    brand: "HyperTech",
    rating: 5,
    reviews: 53,
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80",
    ],
    description:
      "Control de precisión milimétrica para esports. Sensor óptico de 16,000 DPI, switches ópticos de latencia cero y peso pluma de 68 gramos con cable trenzado Paracord.",
    features: [
      "Sensor óptico de alta precisión con hasta 16,000 DPI reales",
      "Peso ultra liviano de solo 68g para movimientos hiper rápidos",
      "6 botones programables con software dedicado",
      "Patines 100% PTFE virgen para un deslizamiento sin fricción",
    ],
    specs: {
      "Sensor": "PixArt PMW3389 Óptico",
      "DPI": "100 a 16,000 DPI ajustables al vuelo",
      "Tasa de Polling": "1000 Hz / 1ms",
      "Iluminación": "RGB PrismSync personalizable",
      "Garantía": "12 Meses",
    },
    stock: 31,
    isFlashOffer: true,
    isFeatured: false,
    colors: [
      { name: "Negro", hex: "#0f172a" },
      { name: "Blanco", hex: "#f8fafc" },
    ],
  },
  {
    id: 9,
    name: "Smartphone Galaxy S24 Ultra 5G AI",
    slug: "smartphone-galaxy-s24-ultra",
    price: 1149.00,
    originalPrice: 1299.00,
    discount: "-12%",
    category: "Smartphones",
    brand: "Samsung",
    rating: 5,
    reviews: 167,
    image: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&auto=format&fit=crop&q=80",
    images: [
      "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80",
    ],
    description:
      "El titán de la telefonía inteligente con Galaxy AI integrada. Chasis de titanio de grado aeroespacial, cámara de 200MP con zoom óptico 5x y el procesador Snapdragon 8 Gen 3 más rápido del mercado.",
    features: [
      "Pantalla Dynamic AMOLED 2X de 6.8'' QHD+ a 120Hz adaptativa con 2600 nits",
      "Cámara cuádruple profesional de 200MP + 50MP Periscopio + 12MP Ultra Gran Angular",
      "S-Pen integrado con latencia imperceptible para notas y diseño",
      "Funciones de Inteligencia Artificial para traducción en vivo y edición generativa",
      "Batería colosal de 5000 mAh con carga súper rápida de 45W",
    ],
    specs: {
      "Procesador": "Snapdragon 8 Gen 3 for Galaxy",
      "RAM / Memoria": "12 GB LPDDR5X / 256 GB UFS 4.0",
      "Cámara Principal": "200 MP OIS f/1.7",
      "Pantalla": "6.8'' Corning Gorilla Armor antirreflejo",
      "Batería": "5000 mAh",
      "Garantía": "12 Meses Oficial",
    },
    stock: 11,
    isFlashOffer: false,
    isFeatured: true,
    colors: [
      { name: "Titanio Gris", hex: "#475569" },
      { name: "Titanio Negro", hex: "#0f172a" },
      { name: "Titanio Violeta", hex: "#6b21a8" },
    ],
    variants: ["256 GB", "512 GB", "1 TB"],
  },
];

export function getProductById(id: number): Product | undefined {
  return PRODUCTS_CATALOG.find((p) => p.id === id);
}

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS_CATALOG.find((p) => p.slug === slug);
}

export function getRelatedProducts(category: string, excludeId: number): Product[] {
  return PRODUCTS_CATALOG.filter(
    (p) => p.category === category && p.id !== excludeId
  ).slice(0, 4);
}
