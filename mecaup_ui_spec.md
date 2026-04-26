# UI Redesign Specification: MecaUp Station

## Goal

Modernize the existing MecaUp Station UI into a premium automotive SaaS-style experience.

The design should feel:
- Modern
- Premium
- Clean
- Automotive
- Trustworthy
- Slightly futuristic
- Mobile responsive

Do not redesign the business logic. Keep the same pages and content, but improve layout, hierarchy, styling, spacing, and visual polish.

---

# Page 1: Public Landing Page

## General Style

Use a clean light theme with dark navy accents.

```css
--background: #f7f8fb;
--surface: #ffffff;
--primary: #0b1220;
--accent: #2563eb;
--text-main: #0f172a;
--text-muted: #64748b;
--border: #e2e8f0;
```

---

## Header

Include:
- Logo (left)
- Navigation: Services, Carnet digital, À propos, Contact
- Language selector
- CTA: **Prendre RDV**

Style:
- Sticky or static clean navbar
- Light background or slight blur
- Thin bottom border
- Rounded CTA button

---

## Hero Section

Large impactful hero with image (garage).

### Headline
Votre voiture.  
Transparente.  
Suivie. Maîtrisée.

- Highlight “Maîtrisée.” in blue

### Subtitle
Chaque intervention tracée. Historique accessible instantanément par QR code.

### Buttons
- Primary: Découvrir nos services
- Secondary: Voir mon carnet

Primary = filled blue  
Secondary = outline

---

## Trust Section

3 items:
- Transparence totale
- Suivi en temps réel
- Données sécurisées

Each:
- Icon
- Title
- Short description

---

## Services Section

Grid layout:
- Desktop: 3 columns
- Tablet: 2
- Mobile: 1

Each card:
- Icon
- Title
- Description
- “Voir détails →”

Style:
- Rounded corners
- Light shadow
- Hover lift effect

---

## QR Promo Section

Dark block with:
- Phone + QR visual
- Text:
  Un simple QR code, tout l’historique.

Stats:
- +1200 véhicules suivis
- 100% transparence
- +8 ans d’expérience

---

# Page 2: Digital Carnet

## General Style

Dark dashboard UI.

```css
--dashboard-bg: #070d16;
--dashboard-surface: #0f1724;
--dashboard-border: rgba(255,255,255,0.1);
--dashboard-text: #f8fafc;
--dashboard-muted: #94a3b8;
--dashboard-accent: #3b82f6;
--dashboard-success: #22c55e;
```

---

## Layout

- Left: main content
- Right: timeline
- Bottom: interventions

---

## Vehicle Card

Include:
- Title: Peugeot 208 Allure
- Description
- License plate UI: 231 TUN 1984

Plate style:
- White card
- Bold text
- Rounded corners

---

## Next Maintenance

Display:
- 192 450 km
- Badge: Dans 12 000 km

Color:
- Green (safe)
- Orange (soon)

---

## Timeline

Vertical layout:
- Création
- Dernière intervention
- Aujourd’hui
- Prochain entretien

Use:
- Line + nodes
- Blue = active
- Green = next

---

## Interventions

Card layout with grid.

Fields:
- Huile moteur
- Viscosité
- Filtres
- Boîte
- Autre
- Prochain entretien

Each item:
- Icon
- Label
- Value
- Status badge

---

## Components

Create reusable:
- Header
- Button
- Card
- Timeline
- Badge

---

## Interaction

Add:
- Hover effects
- Smooth transitions (180ms)
- Card lift
- Button glow

---

## Typography

Use:
- Inter / Manrope / Geist

Sizes:
- Hero: 56–72px
- Titles: 28–48px
- Text: 15–17px

---

## Responsive

Mobile:
- Stack layout
- Single column cards
- Full-width timeline

---

## Constraints

- Keep French content
- Keep automotive identity
- Avoid clutter
- Use blue as main accent
- Green only for success
