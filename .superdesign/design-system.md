# TWX Parser design system

## Character

Calm, precise, technical, and presentation-friendly. Preserve the current product's restrained enterprise visual language. Avoid marketing gradients, decorative illustration, glass effects, oversized rounding, or generic dashboard styling.

## Foundations

- Font: Inter for interface and narrative; system monospace for filenames, XML, JavaScript, identifiers, and type codes.
- Canvas: white with subtle slate surfaces and thin `#e2e8f0` borders.
- Primary text: `#0f172a`; supporting text: `#64748b`.
- Accent: `#4f46e5`, used sparingly for navigation, active states, and data-flow emphasis.
- Semantic colors: critical red `#dc2626`; warning amber `#b45309`; review indigo `#4f46e5`; success green `#166534`.
- Corners: 4px controls and 6px cards.
- Spacing: compact product rhythm, but presentation sections need generous vertical separation and large readable headings.

## Presentation behavior

- Desktop-first, optimized for a projector at 16:9.
- Sticky section navigation and a visible progress indicator.
- Progressive disclosure: one concept per section, with click-to-reveal technical details.
- Use native controls and semantic HTML: buttons, tabs, `details`/`summary`, keyboard-visible focus.
- Diagrams must communicate real code paths and use exact domain language.

## Content hierarchy

1. Product purpose and local execution model.
2. End-to-end TWX processing pipeline.
3. Object-type identification with the special `process` subtype decision.
4. Analyzer context, parsing stages, rule classifications, and toolkit-assisted resolution.
5. Generated output and current UI.
6. Architecture decisions, supported scope, and limitations.
