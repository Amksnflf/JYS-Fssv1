export interface TutorialArticle {
  id: string;
  publishedAt: string;
  image?: string;
  /**
   * Indices of `paragraphs` that should render as section headings instead of
   * body text. Kept as structural metadata so heading detection stays reliable
   * across every language (the old `endsWith('。')` heuristic only worked for
   * Chinese).
   */
  headingIndices?: number[];
}

export const tutorials: TutorialArticle[] = [
  {
    id: 'bitcoin-investment',
    publishedAt: '2022-12-13 12:38:41',
    image: '/assets/tutorial-crypto.svg',
  },
  {
    id: 'why-invest-crypto',
    publishedAt: '2022-12-13 12:38:41',
    image: '/assets/tutorial-crypto.svg',
    headingIndices: [1, 6],
  },
  {
    id: 'stable-mainstream-altcoin',
    publishedAt: '2022-12-12 10:20:15',
    image: '/assets/tutorial-crypto.svg',
  },
  {
    id: 'institution-reference',
    publishedAt: '2022-12-10 09:18:36',
    image: '/assets/tutorial-crypto.svg',
  },
  {
    id: 'necessity',
    publishedAt: '2022-12-09 15:02:08',
  },
  {
    id: 'blockchain-key',
    publishedAt: '2022-12-08 11:46:22',
  },
  {
    id: 'what-is-bitcoin',
    publishedAt: '2022-12-07 16:30:00',
  },
  {
    id: 'beginner-allocate',
    publishedAt: '2022-12-06 14:12:09',
  },
  {
    id: 'bitcoin-ten-years',
    publishedAt: '2022-12-05 13:05:00',
  },
  {
    id: 'defi',
    publishedAt: '2022-12-04 10:00:00',
  },
];

export function findTutorial(id: string | undefined) {
  return tutorials.find((item) => item.id === id);
}
