# Directory Mockup Images

Esta carpeta contiene las imágenes del mockup del South Florida Med Spa Directory para la sección Directory.

## Imágenes Requeridas

### 1. `directory-cover.png`
**Descripción**: Portada del directorio con fondo teal/turquesa
**Contenido**:
- Logo "Enhance work" en la parte superior
- Título principal: "Everything You Need to Know" (en teal/cyan)
- Subtítulo: "about every aesthetic practice in South Florida" (en color claro)
- Texto: "Stop guessing. Start applying to the right places for you."
- Mockups de páginas interiores (2 imágenes pequeñas)
- Estadística: "7,100+ CLINICS" con lista de condados
- Texto inferior: "Updated April 2026"
- Bullets: "• Name, address & contact • Services offered + specialties • Ratings, How to Apply"

**Dimensiones recomendadas**: 520x650px
**Formato**: PNG con transparencia
**Figma Node ID**: `2002:4672` (Cover)

### 2. `directory-page-index.png`
**Descripción**: Página de índice con listado de condados y áreas
**Contenido**:
- Header: "Index"
- Secciones por condado:
  - Miami-Dade County (con mapa)
  - Broward County (con mapa)
  - Palm Beach County (con mapa)
- Lista de áreas por condado en 3 columnas
- Número de página: "Page - 3"

**Dimensiones recomendadas**: 520x650px
**Formato**: PNG con fondo blanco
**Figma Node ID**: `2002:4606` (Letter - 19)

### 3. `directory-page-listing.png`
**Descripción**: Página con listado detallado de clínicas
**Contenido**:
- Ejemplo de clínica: "SkinSpirit"
- Información detallada:
  - Ubicación con mapa
  - Teléfono y website
  - Instagram con followers
  - Medical Director
  - Primary Specialty
  - Servicios (Botox, Filler, etc.)
  - Roles que contratan
  - Score/Rating
  - Cómo aplican (Indeed + careers page)
- Tier badge (Tier 1 - Elite, Tier 2 - Established, Tier 3 - Growing)
- Número de página: "Page 3-10"

**Dimensiones recomendadas**: 520x650px
**Formato**: PNG con fondo blanco
**Figma Node ID**: `2002:4333` (Letter - 20)

## Cómo Exportar desde Figma

1. Abre el archivo de Figma: https://www.figma.com/design/7PC0XW0dQAdkS9MXEXTGx3/Website-Design?node-id=2001-3925
2. Selecciona cada capa (Cover, Letter - 19, Letter - 20)
3. Click derecho → Export → PNG @2x
4. Guarda con los nombres especificados arriba

## Uso en el Código

Las imágenes se referencian en `src/sections/Directory.astro`:

```astro
<img src="/images/mockups/directory-cover.png" alt="..." />
<img src="/images/mockups/directory-page-index.png" alt="..." />
<img src="/images/mockups/directory-page-listing.png" alt="..." />
```

## Notas de Diseño

- Las 3 páginas se apilan con efecto 3D usando CSS transforms
- La portada (cover) está al frente con rotación de -3deg
- La página de índice está en medio con rotación de -8deg
- La página de listado está atrás con rotación de -16deg
- Al hacer hover, las páginas se separan más para mostrar profundidad
