// src/components/calendar/colorUtils.ts

// A centralized palette for consistency.
// value: Raw HSL values for use in CSS variables.
// swatch: Solid color for small UI elements like list dots.
// border: The class for event borders and color picker swatches.
// bg: The semi-transparent background for events and swatches.
export const COLOR_PALETTE = [
    { name: 'red',     value: '0 72% 51%',   swatch: 'bg-red-500',     border: 'border-red-500',     bg: 'bg-red-900/70' },
    { name: 'orange',  value: '25 95% 53%',  swatch: 'bg-orange-500',  border: 'border-orange-500',  bg: 'bg-orange-900/70' },
    { name: 'yellow',  value: '48 96% 53%',  swatch: 'bg-yellow-500',  border: 'border-yellow-500',  bg: 'bg-yellow-900/70' },
    { name: 'lime',    value: '84 81% 44%',  swatch: 'bg-lime-500',    border: 'border-lime-500',    bg: 'bg-lime-900/70' },
    { name: 'green',   value: '142 71% 45%', swatch: 'bg-green-500',   border: 'border-green-500',   bg: 'bg-green-900/70' },
    { name: 'teal',    value: '166 84% 39%', swatch: 'bg-teal-500',    border: 'border-teal-500',    bg: 'bg-teal-900/70' },
    { name: 'cyan',    value: '188 88% 43%', swatch: 'bg-cyan-500',    border: 'border-cyan-500',    bg: 'bg-cyan-900/70' },
    { name: 'blue',    value: '221 83% 53%', swatch: 'bg-blue-500',    border: 'border-blue-500',    bg: 'bg-blue-900/70' },
    { name: 'indigo',  value: '243 75% 59%', swatch: 'bg-indigo-500',  border: 'border-indigo-500',  bg: 'bg-indigo-900/70' },
    { name: 'purple',  value: '262 79% 58%', swatch: 'bg-purple-500',  border: 'border-purple-500',  bg: 'bg-purple-900/70' },
    { name: 'fuchsia', value: '289 79% 58%', swatch: 'bg-fuchsia-500', border: 'border-fuchsia-500', bg: 'bg-fuchsia-900/70' },
    { name: 'pink',    value: '330 81% 56%', swatch: 'bg-pink-500',    border: 'border-pink-500',    bg: 'bg-pink-900/70' },
];

const defaultColors = {
     borderColor: 'border-neutral-500',
    bgColor: 'bg-neutral-900/70',
    swatchColor: 'bg-neutral-500',
    hslValue: '240 5% 65%', // Default HSL for neutral-500
};

// This helper function correctly resolves colors for event bubbles,
// handling both old 'bg-' classes and new 'border-' classes.
export const normalizeColorClasses = (colorString?: string | null) => {
    if (!colorString) {
        return { borderColor: defaultColors.borderColor, bgColor: defaultColors.bgColor };
    }
    const colorName = colorString.split('-')[1]; // Extracts 'red' from 'bg-red-500' or 'border-red-500'
    const paletteColor = COLOR_PALETTE.find(p => p.name === colorName);

    if (paletteColor) {
        return { borderColor: paletteColor.border, bgColor: paletteColor.bg };
    }
    
    return { borderColor: defaultColors.borderColor, bgColor: defaultColors.bgColor };
};

// Helper to get the solid swatch color for UI elements like lists.
export const getSwatchColor = (colorString?: string | null) => {
    if (!colorString) return defaultColors.swatchColor;
    const colorName = colorString.split('-')[1];
    const paletteColor = COLOR_PALETTE.find(p => p.name === colorName);
    return paletteColor ? paletteColor.swatch : defaultColors.swatchColor;
}

// NEW: Helper to get the raw HSL value for dynamic CSS variables.
export const getHslColorValue = (colorString?: string | null): string => {
    if (!colorString) return defaultColors.hslValue;
    const colorName = colorString.split('-')[1];
    const paletteColor = COLOR_PALETTE.find(p => p.name === colorName);
    return paletteColor ? paletteColor.value : defaultColors.hslValue;
};