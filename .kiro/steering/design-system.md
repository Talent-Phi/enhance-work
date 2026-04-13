---
inclusion: always
---

# Figma Design System Integration Rules

This document defines how to integrate Figma designs into the Enhance.work codebase using the Model Context Protocol.

## Project Overview

- **Framework**: Astro 6.0+ (SSR mode with Node adapter)
- **Styling**: Vanilla CSS with CSS Custom Properties
- **Component Architecture**: Astro components (.astro files)
- **Build System**: Vite (via Astro)
- **Node Version**: >=22.12.0

## 1. Design Tokens

### Color System

All colors are defined in `src/styles/global.css` as CSS custom properties:

```css
:root {
  /* Background colors */
  --color-bg:             #f2f2f2;
  --color-bg-white:       #ffffff;
  --color-bg-dark:        #18232c;
  --color-bg-dark-2:      #1b2936;
  --color-card-bg:        #ffffff;
  
  /* Text colors */
  --color-text-heading:   #555555;
  --color-text-body:      #606362;
  --color-text-light:     #dff5f3;
  
  /* Accent colors */
  --color-accent:         #2bbcb0;
  --color-accent-light:   #e6f9f9;
  --color-accent-hover:   #22a89d;
  
  /* Utility colors */
  --color-white-soft:     #f0f5f3;
  --color-border:         rgba(0,0,0,0.08);
}
```

**Usage**: Always reference colors via CSS variables, never hardcode hex values.

### Typography System

Three font families are used:

```css
:root {
  --font-display: 'Syne', sans-serif;      /* Logo, stat numbers */
  --font-heading: 'Poppins', sans-serif;   /* Headlines h1/h2/h3 */
  --font-body:    'Inter', sans-serif;     /* Body text, labels */
}
```

**Font Loading**: Fonts are loaded via Google Fonts in `src/styles/global.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Poppins:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
```

**Typography Scale**:
- `.h1`: `clamp(2rem, 3.5vw, 3.125rem)` — ~50px desktop
- `.h2`: `clamp(1.75rem, 3vw, 3.125rem)` — ~50px desktop
- `.h3`: `1.2rem` — ~19px
- Body: `1rem` (16px base)

### Spacing System

```css
:root {
  --section-padding: 6rem 1.5rem;
  --container-max:   1380px;
  --container-wide:  1440px;
}
```

**Mobile Override** (≤768px):
```css
--section-padding: 3rem 1.25rem;
```

## 2. Component Library

### Component Structure

Components are organized in three directories:

- **`src/components/`** — Reusable UI components (Nav, StatCard, ApplyModal, ApplyForm)
- **`src/sections/`** — Page sections (Hero, CTA, FAQ, Footer, etc.)
- **`src/layouts/`** — Layout wrappers (BaseLayout)

### Component Patterns

#### Astro Component Template

```astro
---
// Component logic (TypeScript)
interface Props {
  title: string;
  description?: string;
}
const { title, description } = Astro.props;
---

<!-- HTML markup -->
<div class="component">
  <h2>{title}</h2>
  {description && <p>{description}</p>}
</div>

<style>
  /* Scoped styles */
  .component {
    /* styles here */
  }
</style>
```

#### Button Component Pattern

Buttons use utility classes defined in `global.css`:

```html
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-secondary">Secondary Action</button>
<button class="btn btn-ghost">Ghost Button</button>
```

**Button Styles**:
- `.btn-primary`: Teal background (#2bbcb0), white text
- `.btn-secondary`: White background, dark text
- `.btn-ghost`: Transparent with border

**Button Specs**:
- Font: Poppins 600
- Size: 1.125rem (18px)
- Padding: 0.8rem 2rem
- Border-radius: 53px (pill shape)
- Hover: translateY(-2px) + box-shadow

## 3. Styling Approach

### CSS Methodology

- **Scoped Styles**: Component-specific styles in `<style>` blocks
- **Global Utilities**: Shared utilities in `src/styles/global.css`
- **BEM-like Naming**: Block__element--modifier pattern (e.g., `ew-form__card`, `stat--dark`)
- **No CSS Preprocessors**: Vanilla CSS only

### Responsive Design

**Breakpoint**: 768px (mobile-first)

```css
@media (max-width: 768px) {
  /* Mobile overrides */
}
```

**Mobile Patterns**:
- Section headers: LEFT aligned (not centered)
- Two-column grids → single column
- Images: full width
- Reduced font sizes

### Layout Utilities

```css
.container {
  width: 100%;
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 1.5rem;
}

.section {
  padding: var(--section-padding);
}
```

## 4. Asset Management

### Directory Structure

```
public/
├── images/
│   ├── blog/           # Blog post images
│   ├── form/           # Form role images
│   ├── hero/           # Hero section assets
│   └── mockups/        # UI mockups
├── icons/              # SVG icons
└── favicon.png         # Favicon
```

### Asset Referencing

Assets in `public/` are referenced from root:

```html
<img src="/images/hero-photo.png" alt="Hero">
<img src="/icons/certificate.svg" alt="Certificate">
```

### Image Optimization

- **Format**: WebP for photos, PNG for graphics, SVG for icons
- **Naming**: Kebab-case (e.g., `hero-photo.png`, `role-aesthetic-provider.jpg`)
- **Alt Text**: Always provide descriptive alt text

## 5. Icon System

### Icon Storage

Icons are stored in `public/icons/` as SVG files:
- `certificate.svg`
- `hospital.svg`
- `portfolio.svg`

### Icon Usage

**Inline SVG** (preferred for styling):
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="..." stroke="currentColor" stroke-width="2"/>
</svg>
```

**Image Tag** (for static icons):
```html
<img src="/icons/certificate.svg" alt="Certificate">
```

### Icon Naming Convention

- Kebab-case
- Descriptive names (e.g., `check-fill`, `arrow-outlined`)
- No prefixes (icons are in dedicated directory)

## 6. Component-Specific Patterns

### StatCard Component

Used for displaying statistics with consistent styling:

```astro
<StatCard 
  value="1.2k" 
  suffix="+" 
  label="Aesthetic practices" 
  dark={false}
/>
```

**Variants**:
- Light: Dark text on light background (hero section)
- Dark: Light text on dark background (CTA section)

### Badge Component

Teal pill with dot indicator:

```html
<span class="badge">8 professionals live right now</span>
```

**Specs**:
- Background: `--color-accent-light` (#e6f9f9)
- Text: `--color-accent` (#2bbcb0)
- Font: Inter 600, 0.75rem
- Border-radius: 100px
- Includes dot pseudo-element

### Label Divider

Section divider with centered label:

```html
<div class="label-divider">
  <span class="label">How it works</span>
</div>
```

## 7. Form Components

### ApplyModal Pattern

The application form (`ApplyModal.astro`) demonstrates:

- **Multi-step form**: 6 steps with progress indicator
- **Fixed height card**: Consistent size across steps
- **Fullscreen overlay**: Gray dotted background
- **Validation**: Client-side validation with error messages
- **File upload**: Resume attachment with preview

**Key Classes**:
- `.ew-form`: Fullscreen container
- `.ew-form__card`: Fixed-height card
- `.ew-form__body`: Scrollable content area
- `.ew-step`: Individual form step
- `.ew-role-grid`: Role selection grid

## 8. Figma MCP Integration Guidelines

### When Converting Figma Designs

1. **Extract Design Tokens First**
   - Colors → CSS custom properties in `:root`
   - Typography → Font family variables
   - Spacing → Spacing scale variables

2. **Component Mapping**
   - Figma frames → Astro components
   - Figma components → Reusable Astro components
   - Figma variants → Component props

3. **Replace Tailwind with CSS Variables**
   - Figma MCP outputs React + Tailwind
   - Convert Tailwind utilities to CSS custom properties
   - Use existing utility classes from `global.css`

4. **Reuse Existing Components**
   - Check `src/components/` before creating new components
   - Extend existing components via props
   - Use composition over duplication

5. **Maintain Visual Parity**
   - Match Figma spacing exactly
   - Use Figma color values (already in CSS vars)
   - Preserve typography scale
   - Validate against Figma screenshot

6. **Responsive Behavior**
   - Desktop-first design (1440px)
   - Mobile breakpoint at 768px
   - Test both viewports

### Code Connect Workflow

1. **Get Design Context**: Use `get_design_context` for Figma node
2. **Review Output**: Analyze React + Tailwind code
3. **Convert to Astro**: Transform to Astro component syntax
4. **Replace Styling**: Swap Tailwind for CSS variables
5. **Map Component**: Use `add_code_connect_map` to link Figma → code

## 9. Project-Specific Conventions

### File Naming

- **Components**: PascalCase (e.g., `ApplyModal.astro`, `StatCard.astro`)
- **Sections**: PascalCase (e.g., `Hero.astro`, `CTA.astro`)
- **Styles**: kebab-case (e.g., `global.css`)
- **Assets**: kebab-case (e.g., `hero-photo.png`)

### Class Naming

- **Utility classes**: Single word (e.g., `.btn`, `.badge`, `.container`)
- **Component classes**: BEM-like (e.g., `.ew-form__card`, `.stat--dark`)
- **State classes**: `.active`, `.hidden`, `.disabled`

### Code Organization

```
src/
├── components/     # Reusable UI components
├── sections/       # Page sections
├── layouts/        # Layout wrappers
├── pages/          # Route pages
├── styles/         # Global styles
├── data/           # Static data
└── lib/            # Utilities
```

## 10. Accessibility

- **Semantic HTML**: Use proper heading hierarchy
- **ARIA Labels**: Add `aria-label` for icon buttons
- **Focus States**: Ensure keyboard navigation works
- **Alt Text**: Provide descriptive alt text for images
- **Color Contrast**: Follow WCAG AA standards (already in design)

## 11. Performance

- **Image Optimization**: Use WebP format
- **Font Loading**: Preconnect to Google Fonts
- **CSS Scope**: Keep styles scoped to components
- **Lazy Loading**: Use `loading="lazy"` for below-fold images

## Summary

When integrating Figma designs:
1. Use existing CSS custom properties for colors and typography
2. Convert Tailwind utilities to CSS variables
3. Reuse existing components from `src/components/`
4. Follow BEM-like naming for new component classes
5. Maintain 1:1 visual parity with Figma
6. Test responsive behavior at 768px breakpoint
7. Validate accessibility and semantic HTML
