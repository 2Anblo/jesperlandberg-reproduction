// All site content lives here. Swap these placeholders for your own work.

export const site = {
  name: 'Your Name',
  title: 'Your Name — design engineer',
  bio:
    'Your Name builds playful, tactile websites where code and motion do the storytelling. ' +
    'Replace this paragraph with a few lines about how you work, who you work with ' +
    'and what kind of projects you are looking for next.',
  stats: '12 placeholder awards — swap this line for your own highlights',
  links: [
    { label: 'Instagram', href: 'https://instagram.com/' },
    { label: 'X', href: 'https://x.com/' },
    { label: 'Email', href: 'mailto:hello@example.com' },
  ],
}

// `style` picks a procedural artwork generator in textures.js.
// `aspect` is width / height of the card.
export const projects = [
  {
    slug: 'halcyon-type',
    title: 'Halcyon Type',
    description:
      'Specimen page for an imaginary serif family — a waterfall of sizes on warm, paper-toned panels.',
    client: 'Halcyon Foundry',
    year: '2026',
    credit: 'Placeholder',
    style: 'serif',
    mark: 'Halcyon',
    colors: ['#c7b39b', '#8a6f58', '#f3d27a', '#3b2b20'],
    aspect: 1.75,
  },
  {
    slug: 'the-archive',
    title: 'The Archive',
    description:
      'A scrapbook of moodboards, prototypes and finished pieces, stacked like records you can flip through.',
    client: 'Paper Studio',
    year: '2026',
    credit: 'Placeholder',
    style: 'stack',
    mark: ['ARCHIVE', 'VOL. 03'],
    colors: ['#e4572e', '#29335c', '#f3a712', '#a8c686', '#669bbc', '#111111'],
    aspect: 1.74,
  },
  {
    slug: 'field-notes',
    title: 'Field Notes',
    description:
      'A pencil-drawn city map that doubles as an onboarding guide, one neighbourhood per lesson.',
    client: 'Kindred Org',
    year: '2025',
    credit: 'Placeholder',
    style: 'sketch',
    mark: ['THE', 'CITY'],
    colors: ['#f1efe8', '#1d1d1d', '#f5d547'],
    aspect: 1.84,
  },
  {
    slug: 'chapters',
    title: 'Chapters',
    description:
      'Long-read layout where a single numeral and progress ring track your place in the story.',
    client: 'Longform Weekly',
    year: '2025',
    credit: 'Placeholder',
    style: 'chapters',
    mark: ['THE SLOW', 'ART OF', 'PAYING', 'ATTENTION'],
    colors: ['#0d0d0d', '#e8e8e8', '#f5d547'],
    aspect: 1.7,
  },
  {
    slug: 'outer-orbit',
    title: 'Outer Orbit',
    description:
      'A tiny solar system you can steer with your cursor, built as the launch page for an indie game.',
    client: 'Orbit Labs',
    year: '2024',
    credit: 'Placeholder',
    style: 'space',
    mark: 'OUTER ORBIT',
    colors: ['#05060a', '#ff6b3d', '#ffd29d', '#5b7cfa'],
    aspect: 1.78,
  },
  {
    slug: 'grid-system',
    title: 'Grid System',
    description:
      'Placeholder portfolio built from nothing but coloured rectangles and one very heavy typeface.',
    client: 'Ines Varga',
    year: '2024',
    credit: 'Placeholder',
    style: 'blocks',
    mark: ['GRID', 'SYS—', 'TEM'],
    colors: ['#f4f1ea', '#ff4b1f', '#1f4bff', '#111111', '#ffd400'],
    aspect: 1.66,
  },
  {
    slug: 'saltwater',
    title: 'Saltwater',
    description:
      'Dusk-coloured landing page for an imaginary seaside hotel, with hills that drift as you scroll.',
    client: 'Saltwater Co.',
    year: '2023',
    credit: 'Placeholder',
    style: 'landscape',
    mark: 'Saltwater',
    colors: ['#f6c7a1', '#e98a6b', '#6b4e71', '#2c2a4a', '#fff1d6'],
    aspect: 1.8,
  },
  {
    slug: 'afterglow',
    title: 'Afterglow',
    description: 'Glowing gradients and outlined type for a made-up night-time radio station.',
    client: 'Afterglow FM',
    year: '2023',
    credit: 'Placeholder',
    style: 'neon',
    mark: 'AFTERGLOW',
    colors: ['#07070b', '#ff2e88', '#5c2bff', '#00e0ff'],
    aspect: 1.72,
  },
]

// Extra names that only appear in the "Full" index.
export const indexNames = [
  'Do Good Things', '41 Harbour St', 'Mason & Co', 'Vela', 'Ingram', 'Parallel',
  'Techwave', 'Northbound', 'Lumen Fields', 'Kinetic', 'Paper Atlas', 'Five Paths',
  'Energy Park', 'Monolith', 'Mew', 'Primrose',
]
