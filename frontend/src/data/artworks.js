const s = (d, w=32, h=32) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${d}</svg>`;

const heart = s('<path d="M16 28s-11-7-11-14a5.5 5.5 0 0111-1 5.5 5.5 0 0111 1c0 7-11 14-11 14z" fill="#e63946"/>');
const star = s('<path d="M16 2l4 9h9l-7 6 3 9-9-5-9 5 3-9-7-6h9z" fill="#f4a261"/>');
const thumbsUp = s('<path d="M7 15v11h3V15zm6-2c0-2 1-4 2-6l1-3h2c1 2 0 5-1 7h6c1 0 2 1 2 2v1l-2 8c0 1-1 2-2 2H13z" fill="#4361ee"/>');
const fire = s('<path d="M16 2c0 6-6 8-6 14a6 6 0 0012 0c0-4-2-6-3-8-1 2-3 3-3 3s1-5 0-9z" fill="#e76f51"/>');
const crown = s('<path d="M4 24h24l-3-14-5 6-4-8-4 8-5-6z" fill="#d4a843"/><rect x="4" y="24" width="24" height="4" fill="#d4a843"/>');
const peace = s('<circle cx="16" cy="16" r="13" fill="none" stroke="#333" stroke-width="2"/><line x1="16" y1="3" x2="16" y2="29" stroke="#333" stroke-width="2"/><line x1="16" y1="16" x2="8" y2="26" stroke="#333" stroke-width="2"/><line x1="16" y1="16" x2="24" y2="26" stroke="#333" stroke-width="2"/>');

const smile = s('<circle cx="16" cy="16" r="14" fill="#ffd93d"/><circle cx="11" cy="13" r="2" fill="#333"/><circle cx="21" cy="13" r="2" fill="#333"/><path d="M10 20q6 6 12 0" fill="none" stroke="#333" stroke-width="2"/>');
const wink = s('<circle cx="16" cy="16" r="14" fill="#ffd93d"/><circle cx="11" cy="13" r="2" fill="#333"/><line x1="19" y1="13" x2="23" y2="13" stroke="#333" stroke-width="2"/><path d="M10 20q6 6 12 0" fill="none" stroke="#333" stroke-width="2"/>');
const cool = s('<circle cx="16" cy="16" r="14" fill="#ffd93d"/><rect x="7" y="11" width="18" height="5" rx="2" fill="#333"/><path d="M10 20q6 6 12 0" fill="none" stroke="#333" stroke-width="2"/>');
const laugh = s('<circle cx="16" cy="16" r="14" fill="#ffd93d"/><path d="M11 12l-3 2 3 2" fill="none" stroke="#333" stroke-width="1.5"/><path d="M21 12l3 2-3 2" fill="none" stroke="#333" stroke-width="1.5"/><path d="M8 19a8 8 0 0016 0z" fill="#333"/>');
const love = s('<circle cx="16" cy="16" r="14" fill="#ffd93d"/><path d="M9 13s0-3 2.5-3 2.5 3 2.5 3-2.5 3-2.5 3-2.5-3-2.5-3z" fill="#e63946"/><path d="M18 13s0-3 2.5-3 2.5 3 2.5 3-2.5 3-2.5 3-2.5-3-2.5-3z" fill="#e63946"/><path d="M10 20q6 4 12 0" fill="none" stroke="#333" stroke-width="2"/>');
const sad = s('<circle cx="16" cy="16" r="14" fill="#ffd93d"/><circle cx="11" cy="13" r="2" fill="#333"/><circle cx="21" cy="13" r="2" fill="#333"/><path d="M10 23q6-6 12 0" fill="none" stroke="#333" stroke-width="2"/>');

const circle = s('<circle cx="16" cy="16" r="12" fill="#4361ee"/>');
const triangle = s('<polygon points="16,4 28,28 4,28" fill="#2d6b3f"/>');
const square = s('<rect x="4" y="4" width="24" height="24" fill="#e63946"/>');
const diamond = s('<polygon points="16,2 30,16 16,30 2,16" fill="#d4a843"/>');
const hexagon = s('<polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="#6b3fa0"/>');
const arrow = s('<path d="M16 4l12 12h-8v12h-8V16H4z" fill="#333"/>');
const checkMark = s('<path d="M6 16l6 6 14-14" fill="none" stroke="#2d6b3f" stroke-width="3"/>');
const crossMark = s('<line x1="6" y1="6" x2="26" y2="26" stroke="#e63946" stroke-width="3"/><line x1="26" y1="6" x2="6" y2="26" stroke="#e63946" stroke-width="3"/>');

const soccer = s('<circle cx="16" cy="16" r="13" fill="white" stroke="#333" stroke-width="1.5"/><path d="M16 3l3 6h-6zM29 16l-6 3v-6zM16 29l-3-6h6zM3 16l6-3v6z" fill="#333"/>');
const basketball = s('<circle cx="16" cy="16" r="13" fill="#e76f51" stroke="#333" stroke-width="1"/><path d="M3 16h26M16 3v26M6 6q10 10 0 20M26 6q-10 10 0 20" fill="none" stroke="#333" stroke-width="1"/>');
const football = s('<ellipse cx="16" cy="16" rx="8" ry="13" fill="#8B4513" stroke="#333" stroke-width="1" transform="rotate(-30 16 16)"/><line x1="11" y1="10" x2="21" y2="22" stroke="white" stroke-width="1.5"/><path d="M13 13l2-2M15 15l2-2M17 17l2-2M19 19l2-2" stroke="white" stroke-width="1"/>');
const trophy = s('<path d="M10 4h12v8a6 6 0 01-12 0zM10 6H6v4a4 4 0 004 4M22 6h4v4a4 4 0 01-4 4M13 18h6v3h-6zM11 21h10v3H11z" fill="#d4a843" stroke="#333" stroke-width="0.5"/>');

const letterA = s('<text x="16" y="24" text-anchor="middle" font-size="24" font-weight="bold" fill="#333">A</text>');
const letterB = s('<text x="16" y="24" text-anchor="middle" font-size="24" font-weight="bold" fill="#333">B</text>');
const num1 = s('<text x="16" y="24" text-anchor="middle" font-size="24" font-weight="bold" fill="#e63946">1</text>');
const num2 = s('<text x="16" y="24" text-anchor="middle" font-size="24" font-weight="bold" fill="#e63946">2</text>');
const hash = s('<text x="16" y="24" text-anchor="middle" font-size="24" font-weight="bold" fill="#4361ee">#</text>');
const amp = s('<text x="16" y="24" text-anchor="middle" font-size="22" font-weight="bold" fill="#6b3fa0">&amp;</text>');

const cat = s('<circle cx="16" cy="18" r="10" fill="#f4a261"/><circle cx="12" cy="16" r="1.5" fill="#333"/><circle cx="20" cy="16" r="1.5" fill="#333"/><polygon points="8,10 6,2 14,8" fill="#f4a261"/><polygon points="24,10 26,2 18,8" fill="#f4a261"/><path d="M14 20q2 2 4 0" fill="none" stroke="#333" stroke-width="1"/>');
const dog = s('<circle cx="16" cy="18" r="10" fill="#d4a843"/><circle cx="12" cy="16" r="1.5" fill="#333"/><circle cx="20" cy="16" r="1.5" fill="#333"/><ellipse cx="8" cy="10" rx="4" ry="6" fill="#c4903a"/><ellipse cx="24" cy="10" rx="4" ry="6" fill="#c4903a"/><ellipse cx="16" cy="22" rx="3" ry="2" fill="#333"/>');
const paw = s('<circle cx="16" cy="20" r="6" fill="#333"/><circle cx="10" cy="12" r="3" fill="#333"/><circle cx="16" cy="9" r="3" fill="#333"/><circle cx="22" cy="12" r="3" fill="#333"/>');
const bird = s('<circle cx="16" cy="16" r="8" fill="#4361ee"/><polygon points="8,16 2,14 2,18" fill="#d4a843"/><circle cx="18" cy="14" r="1.5" fill="white"/><circle cx="18" cy="14" r="0.8" fill="#333"/>');
const fish = s('<ellipse cx="16" cy="16" rx="10" ry="6" fill="#457b9d"/><polygon points="26,16 32,10 32,22" fill="#457b9d"/><circle cx="12" cy="14" r="1.5" fill="white"/><circle cx="12" cy="14" r="0.8" fill="#333"/>');
const butterfly = s('<ellipse cx="10" cy="12" rx="6" ry="8" fill="#e88baf" transform="rotate(-15 10 12)"/><ellipse cx="22" cy="12" rx="6" ry="8" fill="#e88baf" transform="rotate(15 22 12)"/><ellipse cx="10" cy="22" rx="5" ry="6" fill="#c4e20f" transform="rotate(15 10 22)"/><ellipse cx="22" cy="22" rx="5" ry="6" fill="#c4e20f" transform="rotate(-15 22 22)"/><line x1="16" y1="6" x2="16" y2="28" stroke="#333" stroke-width="1.5"/>');

const lion = s('<circle cx="16" cy="16" r="13" fill="#d4a843"/><circle cx="16" cy="18" r="8" fill="#f4a261"/><circle cx="13" cy="16" r="1.5" fill="#333"/><circle cx="19" cy="16" r="1.5" fill="#333"/><path d="M14 20q2 2 4 0" stroke="#333" fill="none" stroke-width="1"/>');
const bear = s('<circle cx="16" cy="18" r="10" fill="#8B4513"/><circle cx="10" cy="10" r="4" fill="#8B4513"/><circle cx="22" cy="10" r="4" fill="#8B4513"/><circle cx="13" cy="16" r="1.5" fill="#333"/><circle cx="19" cy="16" r="1.5" fill="#333"/><ellipse cx="16" cy="20" rx="3" ry="2" fill="#333"/>');

const tree = s('<rect x="14" y="18" width="4" height="10" fill="#8B4513"/><polygon points="16,2 26,18 6,18" fill="#2d6b3f"/>');
const flower = s('<circle cx="16" cy="14" r="4" fill="#e63946"/><circle cx="21" cy="17" r="4" fill="#e63946"/><circle cx="19" cy="23" r="4" fill="#e63946"/><circle cx="13" cy="23" r="4" fill="#e63946"/><circle cx="11" cy="17" r="4" fill="#e63946"/><circle cx="16" cy="18" r="3" fill="#ffd93d"/><line x1="16" y1="22" x2="16" y2="30" stroke="#2d6b3f" stroke-width="2"/>');
const sun = s('<circle cx="16" cy="16" r="6" fill="#ffd93d"/><line x1="16" y1="2" x2="16" y2="8" stroke="#ffd93d" stroke-width="2"/><line x1="16" y1="24" x2="16" y2="30" stroke="#ffd93d" stroke-width="2"/><line x1="2" y1="16" x2="8" y2="16" stroke="#ffd93d" stroke-width="2"/><line x1="24" y1="16" x2="30" y2="16" stroke="#ffd93d" stroke-width="2"/>');
const moon = s('<path d="M20 4a12 12 0 100 24 10 10 0 010-24z" fill="#f4a261"/>');
const leaf = s('<path d="M6 28Q6 6 28 4Q28 26 6 28z" fill="#2d6b3f"/><path d="M6 28Q16 16 28 4" fill="none" stroke="#1a5c30" stroke-width="1.5"/>');
const cloud = s('<circle cx="12" cy="18" r="6" fill="#adb5bd"/><circle cx="20" cy="18" r="7" fill="#adb5bd"/><circle cx="16" cy="13" r="5" fill="#adb5bd"/>');

const flag = s('<rect x="6" y="4" width="22" height="6" fill="#e63946"/><rect x="6" y="10" width="22" height="6" fill="white"/><rect x="6" y="16" width="22" height="6" fill="#4361ee"/><line x1="6" y1="4" x2="6" y2="28" stroke="#333" stroke-width="2"/>');
const eagle = s('<path d="M16 4l-8 12h6v8h4v-8h6z" fill="#333"/><circle cx="16" cy="8" r="3" fill="#d4a843"/>');
const liberty = s('<path d="M16 8l-6 20h12zM14 8h4v-4h-4zM12 4l4-2 4 2" fill="#2d6b3f" stroke="#333" stroke-width="0.5"/>');

const balloon = s('<circle cx="12" cy="10" r="6" fill="#e63946"/><circle cx="20" cy="12" r="5" fill="#4361ee"/><circle cx="16" cy="8" r="5" fill="#ffd93d"/><path d="M12 16l0 10M20 17l0 9M16 13l0 13" stroke="#333" stroke-width="0.5"/>');
const cake = s('<rect x="6" y="16" width="20" height="10" rx="2" fill="#e88baf"/><rect x="8" y="12" width="16" height="4" fill="#ffd93d"/><rect x="15" y="6" width="2" height="6" fill="#333"/><circle cx="16" cy="5" r="2" fill="#e63946"/>');
const gift = s('<rect x="6" y="14" width="20" height="14" fill="#e63946"/><rect x="6" y="10" width="20" height="4" fill="#c1303a"/><rect x="14" y="10" width="4" height="18" fill="#ffd93d"/><path d="M16 10l-6-6M16 10l6-6" fill="none" stroke="#ffd93d" stroke-width="2"/>');
const confetti = s('<circle cx="8" cy="8" r="2" fill="#e63946"/><circle cx="24" cy="6" r="2" fill="#4361ee"/><circle cx="6" cy="22" r="2" fill="#ffd93d"/><circle cx="26" cy="24" r="2" fill="#2d6b3f"/><rect x="12" y="12" width="3" height="3" fill="#e76f51" transform="rotate(30 13.5 13.5)"/><rect x="18" y="18" width="3" height="3" fill="#6b3fa0" transform="rotate(45 19.5 19.5)"/>');

const medal = s('<circle cx="16" cy="18" r="8" fill="#d4a843" stroke="#333" stroke-width="1"/><path d="M12 4h8l-2 8h-4z" fill="#e63946"/><text x="16" y="22" text-anchor="middle" font-size="10" fill="#333">★</text>');
const shield = s('<path d="M16 2L4 8v8c0 8 5 12 12 16 7-4 12-8 12-16V8z" fill="#1b2a4a" stroke="#d4a843" stroke-width="1.5"/>');
const tank = s('<rect x="4" y="18" width="24" height="8" rx="4" fill="#4a4a4a"/><rect x="10" y="12" width="12" height="6" fill="#4a4a4a"/><rect x="18" y="10" width="10" height="3" rx="1" fill="#4a4a4a"/>');

const hammer = s('<rect x="14" y="14" width="4" height="16" rx="1" fill="#8B4513"/><rect x="8" y="8" width="16" height="6" rx="2" fill="#999"/>');
const chef = s('<circle cx="16" cy="20" r="8" fill="#f4a261"/><circle cx="13" cy="18" r="1" fill="#333"/><circle cx="19" cy="18" r="1" fill="#333"/><path d="M14 22q2 2 4 0" fill="none" stroke="#333" stroke-width="1"/><path d="M8 14q0-10 8-10t8 10" fill="white" stroke="#333" stroke-width="0.5"/>');
const doctor = s('<circle cx="16" cy="14" r="8" fill="#457b9d"/><rect x="14" y="10" width="4" height="8" fill="white"/><rect x="12" y="12" width="8" height="4" fill="white"/>');

const gradCap = s('<polygon points="16,8 2,16 16,24 30,16" fill="#333"/><line x1="16" y1="24" x2="16" y2="16" stroke="#333" stroke-width="1.5"/><path d="M8 18v6q8 4 16 0v-6" fill="#333"/>');

const note = s('<circle cx="12" cy="22" r="4" fill="#333"/><line x1="16" y1="22" x2="16" y2="6" stroke="#333" stroke-width="2"/><path d="M16 6l8 4v-4l-8-2z" fill="#333"/>');
const guitar = s('<ellipse cx="16" cy="22" rx="6" ry="7" fill="#8B4513"/><rect x="15" y="4" width="2" height="18" fill="#8B4513"/><rect x="12" y="2" width="8" height="4" rx="1" fill="#333"/>');

export const artCategories = [
  {
    id: 'popular', name: 'Most Popular',
    icon: '<svg viewBox="0 0 36 36" width="36" height="36"><path d="M18 28s-11-7-11-14a5.5 5.5 0 0111-1 5.5 5.5 0 0111 1c0 7-11 14-11 14z" fill="#e63946"/></svg>',
    items: [
      { name: 'Heart', svg: heart }, { name: 'Star', svg: star },
      { name: 'Thumbs Up', svg: thumbsUp }, { name: 'Fire', svg: fire },
      { name: 'Crown', svg: crown }, { name: 'Peace', svg: peace },
      { name: 'Check', svg: checkMark }, { name: 'Arrow', svg: arrow },
    ],
  },
  {
    id: 'emojis', name: 'Emojis',
    icon: '<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="14" fill="#ffd93d"/><circle cx="13" cy="15" r="2" fill="#333"/><circle cx="23" cy="15" r="2" fill="#333"/><path d="M12 22q6 6 12 0" fill="none" stroke="#333" stroke-width="2"/></svg>',
    items: [
      { name: 'Smile', svg: smile }, { name: 'Wink', svg: wink },
      { name: 'Cool', svg: cool }, { name: 'Laugh', svg: laugh },
      { name: 'Love Eyes', svg: love }, { name: 'Sad', svg: sad },
      { name: 'Fire', svg: fire }, { name: 'Crown', svg: crown },
    ],
  },
  {
    id: 'shapes', name: 'Shapes & Symbols',
    icon: '<svg viewBox="0 0 36 36" width="36" height="36"><polygon points="18,4 32,30 4,30" fill="none" stroke="#555" stroke-width="2"/><circle cx="18" cy="20" r="6" fill="none" stroke="#555" stroke-width="2"/></svg>',
    items: [
      { name: 'Circle', svg: circle }, { name: 'Triangle', svg: triangle },
      { name: 'Square', svg: square }, { name: 'Diamond', svg: diamond },
      { name: 'Hexagon', svg: hexagon }, { name: 'Arrow', svg: arrow },
      { name: 'Check', svg: checkMark }, { name: 'Cross', svg: crossMark },
    ],
  },
  {
    id: 'sports', name: 'Sports & Games',
    icon: '<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="12" fill="white" stroke="#333" stroke-width="1.5"/><path d="M18 6l3 5h-6zM30 18l-5 3v-6zM18 30l-3-5h6zM6 18l5-3v6z" fill="#333"/></svg>',
    items: [
      { name: 'Soccer', svg: soccer }, { name: 'Basketball', svg: basketball },
      { name: 'Football', svg: football }, { name: 'Trophy', svg: trophy },
      { name: 'Medal', svg: medal }, { name: 'Star', svg: star },
      { name: 'Fire', svg: fire }, { name: 'Crown', svg: crown },
    ],
  },
  {
    id: 'letters', name: 'Letters & Numbers',
    icon: '<svg viewBox="0 0 36 36" width="36" height="36"><text x="8" y="20" font-size="14" font-weight="bold" fill="#333">A</text><text x="18" y="28" font-size="14" font-weight="bold" fill="#e63946">1</text></svg>',
    items: [
      { name: 'A', svg: letterA }, { name: 'B', svg: letterB },
      { name: '1', svg: num1 }, { name: '2', svg: num2 },
      { name: '#', svg: hash }, { name: '&', svg: amp },
      { name: 'Star', svg: star }, { name: 'Crown', svg: crown },
    ],
  },
  {
    id: 'animals', name: 'Animals',
    icon: '<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="20" r="10" fill="#f4a261"/><circle cx="14" cy="18" r="1.5" fill="#333"/><circle cx="22" cy="18" r="1.5" fill="#333"/><polygon points="10,12 8,4 16,10" fill="#f4a261"/><polygon points="26,12 28,4 20,10" fill="#f4a261"/></svg>',
    items: [
      { name: 'Cat', svg: cat }, { name: 'Dog', svg: dog },
      { name: 'Paw', svg: paw }, { name: 'Bird', svg: bird },
      { name: 'Fish', svg: fish }, { name: 'Butterfly', svg: butterfly },
      { name: 'Lion', svg: lion }, { name: 'Bear', svg: bear },
    ],
  },
  {
    id: 'mascots', name: 'Mascots',
    icon: '<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="12" fill="#d4a843"/><circle cx="18" cy="20" r="7" fill="#f4a261"/><circle cx="15" cy="18" r="1.5" fill="#333"/><circle cx="21" cy="18" r="1.5" fill="#333"/></svg>',
    items: [
      { name: 'Lion', svg: lion }, { name: 'Bear', svg: bear },
      { name: 'Eagle', svg: eagle }, { name: 'Dog', svg: dog },
      { name: 'Cat', svg: cat }, { name: 'Trophy', svg: trophy },
      { name: 'Crown', svg: crown }, { name: 'Shield', svg: shield },
    ],
  },
  {
    id: 'nature', name: 'Nature',
    icon: '<svg viewBox="0 0 36 36" width="36" height="36"><polygon points="18,4 28,20 8,20" fill="#2d6b3f"/><rect x="16" y="20" width="4" height="8" fill="#8B4513"/></svg>',
    items: [
      { name: 'Tree', svg: tree }, { name: 'Flower', svg: flower },
      { name: 'Sun', svg: sun }, { name: 'Moon', svg: moon },
      { name: 'Leaf', svg: leaf }, { name: 'Cloud', svg: cloud },
      { name: 'Butterfly', svg: butterfly }, { name: 'Bird', svg: bird },
    ],
  },
  {
    id: 'america', name: 'America',
    icon: '<svg viewBox="0 0 36 36" width="36" height="36"><rect x="6" y="6" width="24" height="6" fill="#e63946"/><rect x="6" y="12" width="24" height="6" fill="white"/><rect x="6" y="18" width="24" height="6" fill="#4361ee"/><line x1="6" y1="6" x2="6" y2="30" stroke="#333" stroke-width="2"/></svg>',
    items: [
      { name: 'Flag', svg: flag }, { name: 'Eagle', svg: eagle },
      { name: 'Liberty', svg: liberty }, { name: 'Star', svg: star },
      { name: 'Shield', svg: shield }, { name: 'Medal', svg: medal },
      { name: 'Crown', svg: crown }, { name: 'Fire', svg: fire },
    ],
  },
  {
    id: 'parties', name: 'Parties & Events',
    icon: '<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="14" cy="10" r="5" fill="#e63946"/><circle cx="22" cy="12" r="4" fill="#4361ee"/><circle cx="18" cy="8" r="4" fill="#ffd93d"/></svg>',
    items: [
      { name: 'Balloon', svg: balloon }, { name: 'Cake', svg: cake },
      { name: 'Gift', svg: gift }, { name: 'Confetti', svg: confetti },
      { name: 'Crown', svg: crown }, { name: 'Star', svg: star },
      { name: 'Heart', svg: heart }, { name: 'Trophy', svg: trophy },
    ],
  },
  {
    id: 'military', name: 'Military',
    icon: '<svg viewBox="0 0 36 36" width="36" height="36"><path d="M18 4L6 10v8c0 8 5 12 12 16 7-4 12-8 12-16V10z" fill="#1b2a4a" stroke="#d4a843" stroke-width="1.5"/></svg>',
    items: [
      { name: 'Shield', svg: shield }, { name: 'Medal', svg: medal },
      { name: 'Tank', svg: tank }, { name: 'Star', svg: star },
      { name: 'Eagle', svg: eagle }, { name: 'Flag', svg: flag },
      { name: 'Crown', svg: crown }, { name: 'Arrow', svg: arrow },
    ],
  },
  {
    id: 'occupations', name: 'Occupations',
    icon: '<svg viewBox="0 0 36 36" width="36" height="36"><rect x="12" y="16" width="4" height="14" rx="1" fill="#8B4513"/><rect x="6" y="8" width="16" height="8" rx="2" fill="#999"/></svg>',
    items: [
      { name: 'Hammer', svg: hammer }, { name: 'Chef', svg: chef },
      { name: 'Doctor', svg: doctor }, { name: 'Grad Cap', svg: gradCap },
      { name: 'Trophy', svg: trophy }, { name: 'Star', svg: star },
      { name: 'Medal', svg: medal }, { name: 'Crown', svg: crown },
    ],
  },
  {
    id: 'colleges', name: 'Colleges',
    icon: '<svg viewBox="0 0 36 36" width="36" height="36"><polygon points="18,8 4,16 18,24 32,16" fill="#333"/><path d="M10 18v6q8 4 16 0v-6" fill="#333"/></svg>',
    items: [
      { name: 'Grad Cap', svg: gradCap }, { name: 'Trophy', svg: trophy },
      { name: 'Star', svg: star }, { name: 'Shield', svg: shield },
      { name: 'Eagle', svg: eagle }, { name: 'Crown', svg: crown },
      { name: 'Medal', svg: medal }, { name: 'Heart', svg: heart },
    ],
  },
  {
    id: 'music', name: 'Music',
    icon: '<svg viewBox="0 0 36 36" width="36" height="36"><circle cx="14" cy="24" r="4" fill="#333"/><line x1="18" y1="24" x2="18" y2="8" stroke="#333" stroke-width="2"/><path d="M18 8l8 4v-4l-8-2z" fill="#333"/></svg>',
    items: [
      { name: 'Music Note', svg: note }, { name: 'Guitar', svg: guitar },
      { name: 'Star', svg: star }, { name: 'Heart', svg: heart },
      { name: 'Fire', svg: fire }, { name: 'Crown', svg: crown },
      { name: 'Peace', svg: peace }, { name: 'Diamond', svg: diamond },
    ],
  },
];
