export interface BugtongQuestion {
  id: string;
  category: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

const CLASSIC_BUGTONGS: Array<Omit<BugtongQuestion, 'id'>> = [
  { category: 'Kalikasan', question: 'May katawan walang mukha, may leeg walang ulo.', options: ['Bote', 'Kutsara', 'Baso', 'Payong'], correctIndex: 0 },
  { category: 'Kalikasan', question: 'Dalawang balon, hindi malingon.', options: ['Mata', 'Tenga', 'Ilong', 'Tuhod'], correctIndex: 0 },
  { category: 'Kalikasan', question: 'Isang prinsesa, nakaupo sa tasa.', options: ['Sili', 'Kandila', 'Langgam', 'Palaka'], correctIndex: 0 },
  { category: 'Pagkain', question: 'Buto’t balat, lumilipad.', options: ['Saranggola', 'Buto ng mangga', 'Papel', 'Dahon'], correctIndex: 0 },
  { category: 'Pagkain', question: 'Maliit na bahay, puno ng mga patay.', options: ['Kahon ng posporo', 'Sementeryo', 'Bahay-kubo', 'Aparador'], correctIndex: 0 },
  { category: 'Kalikasan', question: 'Hindi tao, hindi hayop, nagsasalita ng tuwid.', options: ['Orasan', 'Aklat', 'Radyo', 'Anino'], correctIndex: 0 },
  { category: 'Bahay', question: 'May apat na paa ngunit hindi makalakad.', options: ['Mesa', 'Aso', 'Silya', 'Kabayo'], correctIndex: 0 },
  { category: 'Bahay', question: 'May pakpak ngunit hindi ibon, lumilipad sa hangin.', options: ['Bentilador', 'Saranggola', 'Eroplano', 'Lahat ng nabanggit'], correctIndex: 3 },
  { category: 'Kalikasan', question: 'Kapag hiniwa, lalo pang humahaba.', options: ['Kalsada', 'Lapis', 'Lubid', 'Buhok'], correctIndex: 0 },
  { category: 'Pagkain', question: 'May korona ngunit hindi hari, may balbas ngunit hindi pari.', options: ['Pinya', 'Mais', 'Mangga', 'Niyog'], correctIndex: 0 },
  { category: 'Kalikasan', question: 'Bahay ng isang prinsesa, maraming bintana.', options: ['Pinya', 'Pugad', 'Sari-sari store', 'Mansanas'], correctIndex: 0 },
  { category: 'Bahay', question: 'May ngipin ngunit hindi kumakain.', options: ['Suklay', 'Lagari', 'Sipit', 'Tinidor'], correctIndex: 0 },
  { category: 'Bahay', question: 'May mata ngunit hindi nakakakita.', options: ['Karayom', 'Patatas', 'Bagyo', 'Pinto'], correctIndex: 0 },
  { category: 'Kalikasan', question: 'Tumakbo nang tumakbo, hindi napapagod.', options: ['Orasan', 'Ilog', 'Hangin', 'Aso'], correctIndex: 1 },
  { category: 'Bahay', question: 'May ulo at buntot pero walang katawan.', options: ['Barya', 'Ahas', 'Isda', 'Kutsilyo'], correctIndex: 0 },
  { category: 'Pagkain', question: 'Hindi hayop, hindi tao, may balat at buto.', options: ['Prutas', 'Bangka', 'Lapis', 'Puno'], correctIndex: 0 },
  { category: 'Kalikasan', question: 'Araw-araw sumusunod, gabi-gabi nawawala.', options: ['Anino', 'Buwan', 'Orasan', 'Aso'], correctIndex: 0 },
  { category: 'Bahay', question: 'Isang butil ng palay, sakop ang buong bahay.', options: ['Ilaw', 'Butil', 'Barya', 'Kandila'], correctIndex: 0 },
  { category: 'Pagkain', question: 'Dalawang magkaibigan, laging magkasama ngunit hindi nag-uusap.', options: ['Sipit', 'Sapatos', 'Mata', 'Gunting'], correctIndex: 1 },
  { category: 'Kalikasan', question: 'May puno walang bunga, may dahon walang sanga.', options: ['Aklat', 'Mapa', 'Payong', 'Bandila'], correctIndex: 0 },
  { category: 'Bahay', question: 'Binili ko nang isang piso, ginagamit ko nang isang taon.', options: ['Kalendaryo', 'Lapis', 'Payong', 'Kandila'], correctIndex: 0 },
  { category: 'Pagkain', question: 'Mataas kung nakaupo, mababa kung nakatayo.', options: ['Aso', 'Pusa', 'Mesa', 'Upuan'], correctIndex: 0 },
  { category: 'Kalikasan', question: 'May tubig ngunit hindi ilog, may lupa ngunit hindi bukid.', options: ['Mapa', 'Mundo', 'Baso', 'Bangka'], correctIndex: 0 },
  { category: 'Bahay', question: 'Kapag may araw ay nawawala, kapag may dilim ay lumilitaw.', options: ['Anino', 'Bituin', 'Buwan', 'Ilaw'], correctIndex: 1 },
  { category: 'Pagkain', question: 'Hindi hayop ngunit may buntot.', options: ['Sibuyas', 'Kutsara', 'Barya', 'Buwan'], correctIndex: 0 },
  { category: 'Kalikasan', question: 'May bibig ngunit hindi nagsasalita, may katawan ngunit walang buhay.', options: ['Ilog', 'Bote', 'Bangka', 'Kuweba'], correctIndex: 0 },
  { category: 'Bahay', question: 'May apat na paa at isang likod, pahingahan ng pagod.', options: ['Silya', 'Mesa', 'Kama', 'Kabayo'], correctIndex: 0 },
  { category: 'Kalikasan', question: 'Hindi nakikita ngunit nararamdaman.', options: ['Hangin', 'Anino', 'Bituin', 'Usok'], correctIndex: 0 },
  { category: 'Pagkain', question: 'May balat na berde, laman ay pula, buto ay itim.', options: ['Pakwan', 'Papaya', 'Mansanas', 'Talong'], correctIndex: 0 },
  { category: 'Bahay', question: 'May susi ngunit walang kandado, may espasyo ngunit walang silid.', options: ['Piano', 'Keyboard', 'Gitara', 'Mapa'], correctIndex: 1 },
];

// Twenty differently worded round variants keep the pool above 500 entries while preserving classic answers.
const VARIANT_OPENERS = ['Sino ako?', 'Anong bagay ito?', 'Hulaan mo:', 'Bugtong:', 'Ano ang sagot?', 'Kilalanin:', 'Isang palaisipan:', 'Subukan mong hulaan:', 'Ano kaya ito?', 'Munting bugtong:', 'Para sa iyo:', 'Pakinggan:', 'Narito ang tanong:', 'Hulaan natin:', 'May alam ka ba?', 'Tanong ng matatanda:', 'Lumang bugtong:', 'Isipin mo:', 'Mabilisang hulaan:', 'Pang-araw-araw na bugtong:'];

export const BUGTONG_QUESTIONS: BugtongQuestion[] = VARIANT_OPENERS.flatMap((opener, variant) =>
  CLASSIC_BUGTONGS.map((riddle, index) => ({
    ...riddle,
    id: `bugtong-${variant + 1}-${index + 1}`,
    question: `${opener} ${riddle.question}`,
  }))
);
