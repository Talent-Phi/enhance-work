# Directory Mockup Image Specifications

## Overview
This document specifies the requirements for the South Florida Med Spa Directory mockup image that appears in the Directory section of the landing page.

## Image Requirements

### File Details
- **Filename**: `directory-mockup.png`
- **Location**: `public/images/directory-mockup.png`
- **Format**: PNG with transparency
- **Recommended Size**: 1040x1200px (2x for retina)
- **Display Size**: 520x600px

### Design Elements

Based on the Figma design (Frame 3940, node-id=2001:3925), the mockup should show:

1. **Book/Guide Cover** (Teal/Turquoise background)
   - Title: "Everything You Need to Know"
   - Subtitle: "about every aesthetic practice in South Florida"
   - Visual elements showing clinic listings/pages
   - Professional, clean design

2. **Interior Pages** (Visible behind/beside the cover)
   - Show sample clinic listings
   - Include fields like:
     - Clinic name
     - Location
     - Contact information
     - Services offered
     - Specialties
   - Use purple/lavender accent colors for highlights
   - Professional typography

3. **3D Perspective**
   - Slight rotation/perspective view
   - Shows depth and multiple pages
   - Professional mockup style

### Color Palette
- **Primary**: Teal/Turquoise (#2a7a73, #1a5f5a)
- **Accent**: Purple/Lavender (#9b7dd4, #7b6bb5)
- **Text**: Dark gray (#333333)
- **Background**: White (#ffffff)

### Typography
- **Heading**: Poppins Bold
- **Body**: Inter Regular
- **Accent**: Syne (for numbers/stats)

## Temporary Solution

Currently using placeholder image: `/images/mockups/cta-right.png`

Replace with actual directory mockup once created.

## Creation Options

1. **Export from Figma**
   - Navigate to Frame 3940 (node-id=2001:3925)
   - Select the mockup group (Group 3272)
   - Export as PNG @2x

2. **Design Tool**
   - Use Figma, Photoshop, or similar
   - Follow specifications above
   - Ensure high quality for retina displays

3. **3D Mockup Generator**
   - Use tools like Placeit, Smartmockups, or similar
   - Create book/guide mockup with custom cover
   - Add interior page previews

## Implementation

Once the image is created:

1. Save as `public/images/directory-mockup.png`
2. Update `src/sections/Directory.astro`:
   ```astro
   <img 
     src="/images/directory-mockup.png" 
     alt="South Florida Med Spa Directory preview"
     class="directory__mockup-img"
     loading="lazy"
   />
   ```

## Notes

- The mockup should convey professionalism and value
- Should be visually distinct from other mockups on the page
- Must work well on both light and dark backgrounds
- Consider adding subtle shadow/glow effects for depth
