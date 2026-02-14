# FORGE Labs Design System v1.0
## "The FORGE Signature" - Premium Mobile App Design Spec

### Brand DNA (What Makes a FORGE App Instantly Recognizable)
Every FORGE Labs app shares these subtle but consistent traits:
1. **The Warm Gradient** - Never flat colors. Primary actions use a warm gradient (coral-to-amber undertone) that feels human, not corporate
2. **The Breathing Idle** - Mascots and primary elements have a subtle idle animation (gentle float/pulse). Nothing is ever truly static
3. **The Weighted Tap** - Every tap has physics. Spring damping 0.8, response 0.35. Things feel like they have mass
4. **The Soft Dark** - Never #000000. Our dark is #0F0F14 with blue undertones. Our light text is #F5F5F7 (warm white)
5. **The Corner Radius** - 16px on cards, 12px on buttons, 24px on modals. Consistent everywhere
6. **Outfit Font Family** - Clean, modern geometric sans-serif. Not SF Pro (too Apple-generic), not Inter (overused)

---

## Color Palette

### Light Mode
- Background: #FAFAFA
- Surface: #FFFFFF
- Text Primary: #1A1A1E (never pure black)
- Text Secondary: rgba(26, 26, 30, 0.6)
- Text Tertiary: rgba(26, 26, 30, 0.4)
- Primary: #FF6B35 (warm coral)
- Primary Gradient: linear(#FF6B35, #F7931E)
- Secondary: #2D5BFF (trust blue)
- Success: #00C48C
- Warning: #FFB800
- Error: #FF3B5C
- Accent: #8B5CF6 (purple for premium/pro features)

### Dark Mode
- Background: #0F0F14
- Surface: #1A1A22
- Surface Elevated: #242430
- Text Primary: #F5F5F7 (warm white)
- Text Secondary: rgba(245, 245, 247, 0.6)
- Text Tertiary: rgba(245, 245, 247, 0.4)
- All accent colors same as light mode (already high contrast)

---

## Typography (Outfit)
- Display: Outfit Bold 32px, tracking -0.5
- H1: Outfit Bold 28px, tracking -0.3
- H2: Outfit SemiBold 22px
- H3: Outfit SemiBold 18px
- Body: Outfit Regular 16px, line-height 24px
- Caption: Outfit Regular 13px, opacity 0.6
- Button: Outfit SemiBold 16px, tracking 0.3

---

## Animation Constants (The Physics)
```
SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 1,
  overshootClamping: false
}

TAB_SPRING = {
  damping: 18,
  stiffness: 200
}

BOUNCE_IN = {
  type: 'spring',
  damping: 12,
  stiffness: 180
}

FADE_IN = {
  duration: 200,
  easing: 'easeOut'
}

SCALE_TAP = {
  scale: 0.95,
  duration: 100
}
```

---

## Iconography
- Set: HeroIcons (Outline + Solid pairs)
- Inactive: Outline variant, opacity 0.5
- Active: Solid variant, full opacity, with 50ms cross-dissolve
- Size: 24px navigation, 20px inline, 16px caption

---

## Mascot: Buddy the Shield
- Shape: Rounded shield silhouette with expressive face
- Colors: Primary coral gradient body, white face area
- Expressions: Happy (default), Thinking (loading), Angry (denial), Celebrating (approval), Confused (error), Sleeping (empty state)
- Idle animation: Gentle float (translateY +/- 4px, 3s loop) + slow breathing (scaleY 1.0 to 1.02)
- Interaction: Tap = bounce + giggle haptic

---

## Component Specs

### Tab Bar
- Background: Surface with 0.9 opacity + blur(20)
- Height: 80px (safe area aware)
- Icons: 24px, with label 11px below
- Active indicator: pill behind active tab (primary color, 0.12 opacity)
- Transition: spring animation on indicator slide
- Haptic: UIImpactFeedbackGenerator.Medium on switch

### Cards
- Radius: 16px
- Shadow (light): 0 2px 12px rgba(0,0,0,0.06)
- Shadow (dark): 0 2px 12px rgba(0,0,0,0.3)
- Padding: 16px
- Press state: scale(0.98) with spring

### Buttons
- Primary: gradient background, white text, radius 12px, height 52px
- Secondary: surface background, primary text, 1px border primary at 0.2 opacity
- Press: scale(0.95) spring + haptic
- Loading: spinner replaces text with cross-fade

### Empty States
- Buddy mascot centered (120x120)
- Context-aware expression
- Header: H2, centered
- Subtext: Body, secondary color, centered
- CTA button below (optional)

### Page Transitions
- Horizontal slide with spring physics
- Damping: 0.8 (feel the weight)
- Incoming page pushes outgoing
- Content fades in at 80% of slide progress

---

## PriorAuth Buddy Specific

### Tabs
1. **Home** (shield icon) - Case dashboard
2. **Cases** (folder icon) - All cases list
3. **Scripts** (phone icon) - Call scripts library
4. **Appeals** (document icon) - Appeal letter generator
5. **Profile** (user icon) - Settings, Pro upgrade

### Buddy Emotional States (mapped to app states)
- **Home empty**: Sleeping Buddy, "No cases yet"
- **Case pending**: Buddy with clock, watching
- **Case approved**: Buddy celebrating, confetti particles
- **Case denied**: Buddy angry/determined, "Let's fight this"
- **Appeal writing**: Buddy with pen, focused
- **Call script active**: Buddy with headset, coaching
- **Deadline approaching**: Buddy alarmed, pulsing red
- **Pro upsell**: Buddy wearing cape/crown

### Gamification
- **Fight Score**: 0-100 per case (completeness of advocacy)
- **Streak**: days actively working cases
- **Badges**: First Appeal, Phone Warrior, Denial Slayer, Pro Advocate
- **Progress ring**: around Buddy on home screen showing overall fight score

---

## The FORGE Signature Checklist (apply to every app)
- [ ] Warm gradient on primary actions
- [ ] Spring physics on all transitions (damping 0.8)
- [ ] Haptic feedback on every tap
- [ ] Mascot with context-aware expressions
- [ ] Breathing idle animation on key elements
- [ ] Soft dark mode (never pure black)
- [ ] Outfit font family throughout
- [ ] 16/12/24 corner radius system
- [ ] Empty states with mascot illustrations
- [ ] Tab bar with outline/solid icon swap + sliding indicator
