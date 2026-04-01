# Enhance.work — Blog External API

API para crear y consultar blog posts desde agentes externos, integraciones o scripts automatizados.

---

## Base URL

```
https://enhance.work
```

---

## Autenticación

Todos los endpoints requieren un token Bearer en el header `Authorization`:

```
Authorization: Bearer <BLOG_API_TOKEN>
```

El token se configura como variable de entorno `BLOG_API_TOKEN` en el servidor.

> ⚠️ Mantén el token seguro. No lo expongas en código público ni en logs.

---

## Endpoints

### `POST /api/blog/external/posts`
Crea un nuevo blog post.

#### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `slug` | string | ✅ | Identificador único en la URL. Solo minúsculas, números y guiones. Ej: `skin-tightening-2026` |
| `title` | string | ✅ | Título principal del post |
| `content` | string | ✅ | Contenido completo en HTML |
| `subtitle` | string | — | Subtítulo o tagline |
| `excerpt` | string | — | Resumen corto (~160 chars). Aparece en listados y previews |
| `date` | string | — | Fecha de display. Ej: `April 1, 2026` |
| `category` | string | — | Categoría. Ej: `Med Spa`, `Skin Care`, `Injectables` |
| `read_time` | string | — | Tiempo estimado de lectura. Ej: `5 min read` |
| `author` | string | — | Nombre completo del autor |
| `author_bio` | string | — | Biografía corta del autor |
| `author_credential` | string | — | Credenciales / título. Ej: `RN, BSN`, `MD, FAAD` |
| `author_expertise` | string[] | — | Array de áreas de expertise. Ej: `["Injectables", "Laser"]` |
| `image` | string | — | URL de la imagen hero. Ej: `/images/blog/my-post.jpg` |
| `status` | string | — | `"published"` o `"draft"`. Default: `"draft"` |
| `sort_order` | integer | — | Orden manual en listados. Menor = primero. Default: `0` |
| `seo_title` | string | — | Tag `<title>` para SEO (50–60 chars ideal) |
| `seo_description` | string | — | Meta description (140–160 chars ideal) |
| `seo_og_image` | string | — | Imagen Open Graph (URL absoluta) |
| `canonical_url` | string | — | URL canónica si difiere del slug |
| `focus_keyword` | string | — | Keyword principal SEO. Ej: `skin tightening treatments 2026` |

#### Ejemplo de request

```bash
curl -X POST https://enhance.work/api/blog/external/posts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "best-skin-tightening-treatments-2026",
    "title": "Best Skin Tightening Treatments in 2026",
    "subtitle": "A complete guide from our medical aesthetics team",
    "excerpt": "Discover the top non-surgical skin tightening treatments in 2026, from radiofrequency to ultrasound-based therapies.",
    "date": "April 1, 2026",
    "category": "Skin Care",
    "read_time": "6 min read",
    "author": "Dr. Sarah Mitchell",
    "author_bio": "Board-certified dermatologist with 12 years in aesthetic medicine.",
    "author_credential": "MD, FAAD",
    "author_expertise": ["Skin Tightening", "RF Treatments", "Ultherapy"],
    "image": "/images/blog/skin-tightening-2026.jpg",
    "content": "<p>Skin laxity is one of the most common concerns...</p><h2>Radiofrequency</h2><p>RF energy heats the dermis...</p>",
    "status": "published",
    "seo_title": "Best Skin Tightening Treatments 2026 | Enhance.work",
    "seo_description": "Explore the most effective non-surgical skin tightening options in 2026. Expert guide from certified aesthetics professionals.",
    "seo_og_image": "https://enhance.work/images/blog/skin-tightening-2026.jpg",
    "focus_keyword": "skin tightening treatments 2026"
  }'
```

#### Respuesta exitosa `201 Created`

```json
{
  "success": true,
  "post": {
    "id": 5,
    "slug": "best-skin-tightening-treatments-2026",
    "title": "Best Skin Tightening Treatments in 2026",
    "status": "published",
    "published_at": "2026-04-01T21:34:13.068Z",
    "created_at": "2026-04-01T21:34:13.068Z"
  }
}
```

#### Errores

| Código | Causa |
|---|---|
| `400` | Faltan campos requeridos (`slug`, `title`, `content`) o el slug tiene formato inválido |
| `401` | Token ausente o incorrecto |
| `409` | El slug ya existe — usar uno diferente |
| `500` | Error interno del servidor |

Ejemplo de error:
```json
{
  "error": "Slug already exists: best-skin-tightening-treatments-2026"
}
```

---

### `GET /api/blog/external/posts`
Lista todos los posts (publicados y borradores).

#### Headers
```
Authorization: Bearer <token>
```

#### Ejemplo de request

```bash
curl https://enhance.work/api/blog/external/posts \
  -H "Authorization: Bearer <token>"
```

#### Respuesta exitosa `200 OK`

```json
{
  "success": true,
  "posts": [
    {
      "id": 5,
      "slug": "best-skin-tightening-treatments-2026",
      "title": "Best Skin Tightening Treatments in 2026",
      "status": "published",
      "date": "April 1, 2026",
      "sort_order": 0,
      "published_at": "2026-04-01T21:34:13.068Z",
      "updated_at": "2026-04-01T21:34:13.068Z"
    }
  ]
}
```

---

## Guía de contenido HTML

El campo `content` acepta HTML completo. Tags soportados:

```html
<!-- Títulos -->
<h2>Sección principal</h2>
<h3>Subsección</h3>
<h4>Detalle</h4>

<!-- Texto -->
<p>Párrafo normal con <strong>negrita</strong>, <em>cursiva</em> y <a href="https://...">enlaces</a>.</p>

<!-- Listas -->
<ul>
  <li>Elemento no ordenado</li>
</ul>
<ol>
  <li>Elemento ordenado</li>
</ol>

<!-- Cita destacada -->
<blockquote>Texto destacado o cita de experto.</blockquote>

<!-- Imágenes dentro del contenido -->
<img src="/images/blog/foto.jpg" alt="Descripción de la imagen">
```

---

## Guía SEO

Para maximizar el posicionamiento de cada post:

| Campo | Recomendación |
|---|---|
| `slug` | Incluir la keyword principal. Ej: `skin-tightening-treatments-2026` |
| `seo_title` | 50–60 chars. Keyword al inicio. Terminar con `\| Enhance.work` |
| `seo_description` | 140–160 chars. Acción + keyword + valor diferencial |
| `focus_keyword` | Frase de 3–5 palabras que aparezca en título, primer H2 y primer párrafo |
| `excerpt` | Texto que aparece en Google snippets. Claro, directo, con la keyword |
| `seo_og_image` | URL absoluta (`https://enhance.work/...`). Dimensión ideal: 1200×630px |

---

## Notas técnicas

- El `slug` debe ser único. Si ya existe, la API retorna `409`.
- Si `status = "published"`, `published_at` se asigna automáticamente con el timestamp actual.
- Si `status = "draft"`, el post no aparece en el sitio público hasta que se publique desde el admin panel.
- `author_expertise` debe ser un array JSON: `["Tag1", "Tag2"]`, no un string.
- El campo `content` puede incluir cualquier HTML válido. Se renderiza directamente en el post.

---

## Variables de entorno requeridas (servidor)

```
BLOG_API_TOKEN=<token-secreto>
```

Configurar en el panel de Render / Railway / Fly.io antes de hacer deploy.
