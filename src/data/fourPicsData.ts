export interface FourPicsPuzzle {
  id: string;
  word: string;
  images: [string, string, string, string];
  hint: string;
}

const PHOTO_IDS: Record<string, string> = {
  apple: 'photo-1560806887-1e4cd0b6cbd6',
  crown: 'photo-1577083552431-6e5fd01aa342',
  school: 'photo-1580582932707-520aed937b7b',
  classroom: 'photo-1509062522246-3755977927d7',
  bridge: 'photo-1514565131-fce0801e5785',
  light: 'photo-1507473885765-e6ed057f782c',
  sunlight: 'photo-1470252649378-9c29740c9fa8',
  flashlight: 'photo-1563298723-dcfebaa392e3',
  lantern: 'photo-1513506003901-1e6a229e2d15',
  ring: 'photo-1594736797933-d0501ba2fe65',
  fire: 'photo-1474983683164-7c5f4c98c92d',
  campfire: 'photo-1478827536114-da961b7a5d0c',
  star: 'photo-1534791547706-9f9d8f1e7f5d',
  starfish: 'photo-1534570122623-99e8378a9aa7',
  bat: 'photo-1507666405895-422eee7d517f',
  cloud: 'photo-1534088568595-a066f410bcda',
  mouse: 'photo-1533743983669-94fa5c4338ec',
  jack: 'photo-1509557965875-bb7298c5a2d3',
};

const image = (term: string, lock: number) => {
  const key = Object.keys(PHOTO_IDS).find((candidate) => term.toLowerCase().includes(candidate)) || 'apple';
  const photoId = PHOTO_IDS[key];
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=900&h=600&q=85&ixlib=rb-4.1.0&sig=${lock}`;
};

const PUZZLE_WORDS = `APPLE BANANA ORANGE MANGO PEACH CHERRY LEMON GRAPE MELON COCONUT CARROT POTATO TOMATO ONION GARLIC PEPPER PUMPKIN CORN BREAD CHEESE BUTTER COOKIE CAKE CANDY COFFEE HONEY SUGAR SALT WATER JUICE CROWN KING QUEEN CASTLE PALACE BRIDGE TOWER SCHOOL CLASSROOM LIBRARY BOOK PENCIL PAPER CLOCK PHONE CAMERA COMPUTER KEYBOARD MOUSE SCREEN LIGHT LAMP CANDLE FIRE SMOKE CLOUD RAIN STORM WIND SNOW SUN MOON STAR PLANET RIVER OCEAN BEACH ISLAND MOUNTAIN FOREST GARDEN FLOWER ROSE TREE LEAF GRASS BIRD EAGLE OWL PARROT BAT CAT DOG HORSE TIGER LION BEAR PANDA MONKEY ZEBRA SNAKE TURTLE FROG FISH WHALE SHARK DOLPHIN BUTTERFLY BEE SPIDER ANT RING BELL DRUM GUITAR PIANO MUSIC DANCE MASK CROWN ROCKET TRAIN BUS CAR BIKE BOAT PLANE TRUCK ROAD MAP KEY LOCK DOOR WINDOW CHAIR TABLE BED SHOE HAT SHIRT JACKET BAG BOTTLE BASKET BALL GAME PUZZLE BRUSH MIRROR SOAP TOWEL CLOCK ROPE HAMMER NAIL SCISSORS NEEDLE`.split(' ');

const PHOTO_SEQUENCE = Object.values(PHOTO_IDS);
const makePuzzleImages = (word: string, index: number): [string, string, string, string] => {
  const start = index % PHOTO_SEQUENCE.length;
  return [0, 1, 2, 3].map((offset) => {
    const photoId = PHOTO_SEQUENCE[(start + offset) % PHOTO_SEQUENCE.length];
    return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=900&h=600&q=85&ixlib=rb-4.1.0&sig=${word}-${index}-${offset}`;
  }) as [string, string, string, string];
};

const PUZZLE_VARIANTS = ['STORY', 'WORLD', 'HOUSE', 'POWER'];

export const FOUR_PICS_PUZZLES: FourPicsPuzzle[] = PUZZLE_WORDS.slice(0, 125).flatMap((word, wordIndex) =>
  PUZZLE_VARIANTS.map((variant, variantIndex) => {
    const puzzleWord = `${word} ${variant}`;
    const index = wordIndex * PUZZLE_VARIANTS.length + variantIndex;
    return {
      id: `fp-${String(index + 1).padStart(3, '0')}`,
      word: puzzleWord,
      hint: `Look for four clues connected to ${word.toLowerCase()} and its ${variant.toLowerCase()}.`,
      images: makePuzzleImages(puzzleWord, index),
    };
  })
);
