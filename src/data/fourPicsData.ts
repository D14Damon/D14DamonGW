export interface FourPicsPuzzle {
  id: string;
  word: string;
  images: [string, string, string, string];
  hint: string;
}

const image = (term: string, lock: number) => `https://loremflickr.com/640/420/${term}?lock=${lock}`;

const BASE_FOUR_PICS_PUZZLES: FourPicsPuzzle[] = [
  { id: 'fp-01', word: 'APPLE', hint: 'A common fruit', images: [image('apple', 1), image('apple-tree', 2), image('apple-pie', 3), image('apple-juice', 4)] },
  { id: 'fp-02', word: 'CROWN', hint: 'A symbol of royalty', images: [image('crown', 5), image('king', 6), image('queen', 7), image('royal', 8)] },
  { id: 'fp-03', word: 'SCHOOL', hint: 'A place to learn', images: [image('school', 9), image('classroom', 10), image('student', 11), image('teacher', 12)] },
  { id: 'fp-04', word: 'BRIDGE', hint: 'It connects two sides', images: [image('bridge', 13), image('bridge-city', 14), image('bridge-river', 15), image('bridge-road', 16)] },
  { id: 'fp-05', word: 'LIGHT', hint: 'It brightens the dark', images: [image('lightbulb', 17), image('sunlight', 18), image('flashlight', 19), image('lantern', 20)] },
  { id: 'fp-06', word: 'RING', hint: 'A circular object', images: [image('ring', 21), image('boxing-ring', 22), image('ring-road', 23), image('bell-ring', 24)] },
  { id: 'fp-07', word: 'FIRE', hint: 'It gives heat', images: [image('fire', 25), image('campfire', 26), image('fireplace', 27), image('firetruck', 28)] },
  { id: 'fp-08', word: 'STAR', hint: 'Seen in the night sky', images: [image('star', 29), image('starfish', 30), image('star-shape', 31), image('night-sky', 32)] },
  { id: 'fp-09', word: 'BAT', hint: 'It can fly or be used in sports', images: [image('bat-animal', 33), image('baseball-bat', 34), image('bat-cave', 35), image('bat-sport', 36)] },
  { id: 'fp-10', word: 'CLOUD', hint: 'It floats above us', images: [image('cloud', 37), image('clouds-sky', 38), image('cloud-computing', 39), image('cloudy', 40)] },
  { id: 'fp-11', word: 'MOUSE', hint: 'It can be an animal or a computer tool', images: [image('mouse-animal', 41), image('computer-mouse', 42), image('mouse-cheese', 43), image('mouse-house', 44)] },
  { id: 'fp-12', word: 'JACK', hint: 'A name shared by several familiar things', images: [image('jack', 45), image('union-jack', 46), image('jack-lantern', 47), image('car-jack', 48)] },
];

export const FOUR_PICS_PUZZLES: FourPicsPuzzle[] = Array.from({ length: 42 }, (_, variant) =>
  BASE_FOUR_PICS_PUZZLES.map((puzzle, index) => ({
    ...puzzle,
    id: `${puzzle.id}-set-${variant + 1}`,
    images: puzzle.images.map((url) => url.replace(/lock=\d+/, `lock=${variant * 50 + index + 1}`)) as [string, string, string, string],
  }))
).flat();
