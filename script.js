/* Neon Striker - logika game (2D/3D, AI, toko, event, main bareng teman) */
(() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ---------------- Konstanta ---------------- */
const W = 1600, H = 900, CY = H / 2, GH = 230, GD = 58, MG = 90;
const PR = 14, BR = 8;
const RUN = 215, SPR = 288, DRAG = 1.15;

const S = { dur: 180, diff: 1, gfx: 1, sound: true, view: 1 };
const DIFF = [
  { mul: .86, gk: .50, err: .20, tk: .36 },
  { mul: .96, gk: .70, err: .12, tk: .30 },
  { mul: 1.05, gk: .86, err: .07, tk: .24 }
];
const MATCH = { out0: 4, gk0: true, out1: 4, gk1: true };
const DRILLS = {
  free:   { out0: 1, gk0: false, out1: 0, gk1: false, mul: 1,   gk: 0,  title: 'Latihan bebas' },
  keeper: { out0: 1, gk0: false, out1: 0, gk1: true,  mul: 1,   gk: .8, title: 'Lawan kiper' },
  defend: { out0: 1, gk0: false, out1: 3, gk1: true,  mul: .62, gk: .65, title: 'Lawan bertahan' }
};
const SLOTS = [[.27, .30, 'DF'], [.27, .70, 'DF'], [.44, .33, 'FW'], [.44, .67, 'FW']];
const SKINS = ['#f1c9a5', '#d9a074', '#a86b45', '#7a4a2e', '#e8b98f'];
const HAIR = ['#1a1a1a', '#3b2314', '#e8c15a', '#ff6f3c', '#2a2a4a'];

/* ---------------- Suara ---------------- */
let AC = null;
function tone(f1, f2, d, type = 'sine', vol = .15, delay = 0) {
  if (!S.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02);
  } catch (e) {}
}
const SFX = {
  kick: () => tone(180, 60, .09, 'triangle', .22),
  pass: () => tone(240, 120, .07, 'triangle', .14),
  tackle: () => tone(120, 50, .12, 'sawtooth', .07),
  save: () => tone(320, 150, .12, 'sawtooth', .09),
  post: () => tone(900, 700, .12, 'square', .05),
  goal: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.01, .35, 'triangle', .14, i * .09)),
  whistle: () => { tone(2600, 2500, .25, 'sine', .08); tone(2600, 2500, .3, 'sine', .08, .32); }
};


/* ---------------- Data: tim negara, formasi, pemain bintang ---------------- */
const TEAMS = [
  { code: 'IDN', name: 'Indonesia', pow: 3, k: ['#e8192c', '#ffffff', '#ffffff'] },
  { code: 'BRA', name: 'Brasil', pow: 5, k: ['#ffdf00', '#1d4fa8', '#009c3b'] },
  { code: 'ARG', name: 'Argentina', pow: 5, k: ['#75aadb', '#1a1a2e', '#ffffff'] },
  { code: 'FRA', name: 'Prancis', pow: 5, k: ['#1c4fb5', '#ffffff', '#ef4135'] },
  { code: 'GER', name: 'Jerman', pow: 4, k: ['#f2f2f2', '#111111', '#dd0000'] },
  { code: 'ENG', name: 'Inggris', pow: 4, k: ['#f4f4f4', '#1b2a6b', '#cf081f'] },
  { code: 'ESP', name: 'Spanyol', pow: 4, k: ['#c60b1e', '#1c2a6b', '#ffc400'] },
  { code: 'POR', name: 'Portugal', pow: 4, k: ['#a50021', '#0a6b2f', '#ffd700'] },
  { code: 'NED', name: 'Belanda', pow: 4, k: ['#ff7a00', '#1a1a1a', '#ffffff'] },
  { code: 'ITA', name: 'Italia', pow: 4, k: ['#1b6dc1', '#ffffff', '#0a2a66'] },
  { code: 'MAR', name: 'Maroko', pow: 3, k: ['#c1272d', '#0a6b3a', '#ffffff'] },
  { code: 'JPN', name: 'Jepang', pow: 3, k: ['#1b3f9e', '#ffffff', '#e60012'] },
  { code: 'KOR', name: 'Korea Selatan', pow: 3, k: ['#cd2e3a', '#0047a0', '#ffffff'] },
  { code: 'USA', name: 'Amerika Serikat', pow: 3, k: ['#f2f2f2', '#1b2a6b', '#c8102e'] },
  { code: 'MEX', name: 'Meksiko', pow: 3, k: ['#0a7a3d', '#ffffff', '#c8102e'] },
  { code: 'COL', name: 'Kolombia', pow: 4, k: ['#ffd100', '#0033a0', '#c8102e'] },
  { code: 'URU', name: 'Uruguay', pow: 4, k: ['#5cb8ea', '#111111', '#ffffff'] },
  { code: 'BEL', name: 'Belgia', pow: 4, k: ['#c8102e', '#111111', '#ffd100'] },
  { code: 'CRO', name: 'Kroasia', pow: 4, k: ['#f2f2f2', '#1b3f9e', '#c8102e'] },
  { code: 'SUI', name: 'Swiss', pow: 3, k: ['#d52b1e', '#ffffff', '#ffffff'] },
  { code: 'DEN', name: 'Denmark', pow: 3, k: ['#b3122b', '#ffffff', '#ffffff'] },
  { code: 'POL', name: 'Polandia', pow: 3, k: ['#ffffff', '#c8102e', '#c8102e'] },
  { code: 'SRB', name: 'Serbia', pow: 3, k: ['#c6363c', '#1b3a7a', '#ffffff'] },
  { code: 'TUR', name: 'Turki', pow: 3, k: ['#e30a17', '#ffffff', '#ffffff'] },
  { code: 'SEN', name: 'Senegal', pow: 4, k: ['#ffffff', '#00853f', '#fdef42'] },
  { code: 'NGA', name: 'Nigeria', pow: 3, k: ['#008751', '#ffffff', '#111111'] },
  { code: 'GHA', name: 'Ghana', pow: 3, k: ['#ffffff', '#111111', '#fcd116'] },
  { code: 'EGY', name: 'Mesir', pow: 3, k: ['#c8102e', '#111111', '#ffffff'] },
  { code: 'AUS', name: 'Australia', pow: 3, k: ['#ffcd00', '#00843d', '#00843d'] },
  { code: 'CAN', name: 'Kanada', pow: 3, k: ['#d52b1e', '#111111', '#ffffff'] },
  { code: 'ECU', name: 'Ekuador', pow: 3, k: ['#ffdd00', '#1b3f9e', '#c8102e'] },
  { code: 'SWE', name: 'Swedia', pow: 3, k: ['#fecc02', '#006aa7', '#006aa7'] },
  { code: 'CHI', name: 'Chile', pow: 3, k: ['#d52b1e', '#1b3f9e', '#ffffff'] }
];
const TEAM = Object.fromEntries(TEAMS.map(t => [t.code, t]));
const FORMS = {
  '2-2': { name: 'Seimbang', desc: 'Dua bek dan dua penyerang. Aman saat bertahan, tetap berbahaya di depan.', slots: [[.27, .30, 'DF'], [.27, .70, 'DF'], [.44, .33, 'FW'], [.44, .67, 'FW']] },
  '1-2-1': { name: 'Berlian', desc: 'Satu bek, dua gelandang, satu penyerang. Kuat menguasai tengah lapangan.', slots: [[.22, .5, 'DF'], [.35, .24, 'MF'], [.35, .76, 'MF'], [.46, .5, 'FW']] },
  '3-1': { name: 'Bertahan', desc: 'Tiga bek dan satu penyerang. Sulit ditembus, andalkan serangan balik.', slots: [[.24, .2, 'DF'], [.24, .5, 'DF'], [.24, .8, 'DF'], [.46, .5, 'FW']] },
  '1-3': { name: 'Menyerang', desc: 'Satu bek dan tiga penyerang. Menekan habis, tetapi rawan diserang balik.', slots: [[.22, .5, 'DF'], [.42, .2, 'FW'], [.46, .5, 'FW'], [.42, .8, 'FW']] },
  '2-1-1': { name: 'Fleksibel', desc: 'Dua bek, satu gelandang penghubung, dan satu penyerang.', slots: [[.26, .3, 'DF'], [.26, .7, 'DF'], [.36, .5, 'MF'], [.47, .5, 'FW']] }
};
const SKS = ['#f6d5b8', '#f1c9a5', '#d9a074', '#a86b45', '#7a4a2e', '#5c3a24'];
const HRS = ['#1a1a1a', '#3b2314', '#e8c15a', '#ff6f3c', '#c04a2a', '#8a8a99'];
const HAND = [
  ['IDN', 'Fajar Setiawan', 'FW', 4, 3, 2, 3, 0], ['IDN', 'Dimas Nugroho', 'DF', 3, 2, 4, 3, 0],
  ['BRA', 'Rafael Souza', 'FW', 5, 5, 2, 4, 0], ['BRA', 'Lucas Barbosa', 'DF', 4, 3, 4, 3, 1],
  ['ARG', 'Matías Fernández', 'FW', 4, 5, 3, 2, 1], ['ARG', 'Nicolás Acosta', 'DF', 3, 3, 5, 1, 1],
  ['FRA', 'Théo Lambert', 'FW', 5, 4, 2, 5, 0], ['FRA', 'Hugo Marchand', 'DF', 4, 2, 5, 4, 1],
  ['GER', 'Jonas Becker', 'FW', 3, 5, 3, 0, 2], ['GER', 'Lukas Hoffmann', 'DF', 3, 3, 5, 0, 1],
  ['ENG', 'Jack Thompson', 'FW', 4, 4, 3, 0, 3], ['ENG', 'Ryan Walker', 'DF', 3, 2, 5, 1, 2],
  ['ESP', 'Álvaro Navarro', 'FW', 4, 4, 3, 1, 1], ['ESP', 'Sergio Molina', 'DF', 3, 3, 4, 2, 0],
  ['POR', 'Tiago Almeida', 'FW', 4, 5, 2, 2, 1], ['POR', 'João Ferreira', 'DF', 4, 3, 4, 2, 0],
  ['NED', 'Daan de Vries', 'FW', 4, 4, 3, 0, 2], ['NED', 'Sven van Dijk', 'DF', 3, 3, 5, 0, 2],
  ['ITA', 'Matteo Ferrari', 'FW', 4, 5, 2, 1, 0], ['ITA', 'Luca Romano', 'DF', 3, 2, 5, 1, 1],
  ['MAR', 'Yassine Benali', 'FW', 5, 4, 2, 3, 0], ['MAR', 'Amine Kabbaj', 'DF', 4, 2, 5, 4, 0],
  ['JPN', 'Haruto Tanaka', 'FW', 5, 3, 2, 1, 0], ['JPN', 'Kaito Yamamoto', 'DF', 4, 2, 4, 1, 0],
  ['KOR', 'Min-jun Kim', 'FW', 5, 3, 3, 1, 0], ['KOR', 'Do-hyun Park', 'DF', 3, 3, 4, 1, 0]
];
// Kumpulan nama bergaya asli tiap negara (f = nama depan, l = nama belakang, sk = rentang kulit, hr = pilihan rambut)
const NP = {
  IDN: { f: 'Fajar Dimas Rizky Bayu Arief Yoga Rangga Hendra Andi Galih Bagas Reza Wahyu Eko', l: 'Setiawan Nugroho Pratama Saputra Wijaya Kurniawan Hidayat Ramadhan Santoso Firmansyah Permana Utomo', sk: [2, 3], hr: [0, 0, 0, 0, 1] },
  BRA: { f: 'Rafael Lucas Gabriel Mateus Thiago Bruno Felipe Diego Vitor Caio Henrique Leandro Rodrigo Gustavo', l: 'Souza Barbosa Oliveira Santos Lima Pereira Costa Ribeiro Carvalho Almeida Moreira Nascimento Cardoso Teixeira', sk: [1, 5], hr: [0, 0, 1, 1, 2, 4] },
  ARG: { f: 'Matías Nicolás Santiago Facundo Lucas Tomás Franco Agustín Emiliano Julián Ezequiel Federico Gonzalo Ignacio', l: 'Fernández Acosta Rodríguez Gómez Sosa Romero Herrera Molina Benítez Ríos Peralta Domínguez Cabrera Aguirre', sk: [0, 3], hr: [0, 1, 1, 2, 4] },
  FRA: { f: 'Théo Hugo Lucas Nathan Enzo Louis Mathis Baptiste Antoine Clément Maxime Romain Julien Alexis', l: 'Lambert Marchand Dubois Moreau Laurent Girard Roux Fontaine Rousseau Leclerc Vidal Perrin Colin Blanchard', sk: [0, 4], hr: [0, 0, 1, 1, 2, 4] },
  GER: { f: 'Jonas Lukas Felix Leon Finn Niklas Tobias Moritz Jannik Maximilian Florian Paul Tim Kilian', l: 'Becker Hoffmann Schneider Wagner Fischer Weber Richter Koch Bauer Krüger Lehmann Vogel Zimmermann Brandt', sk: [0, 2], hr: [1, 1, 2, 2, 0, 4] },
  ENG: { f: 'Jack Ryan Callum Oliver Liam Connor Jamie Ben Tom Luke Dylan Reece Josh Owen', l: 'Thompson Walker Hughes Bennett Foster Holland Barker Fletcher Clarke Mitchell Gibson Ward Pearce Ashby', sk: [0, 4], hr: [1, 1, 2, 3, 0, 4] },
  ESP: { f: 'Álvaro Sergio Pablo Iván Adrián Diego Hugo Marcos Raúl Jorge Dani Rubén Ángel Borja', l: 'Navarro Molina Ortega Serrano Vega Castillo Ramos Delgado Ibáñez Rojas Cortés Herrero Pascual Campos', sk: [0, 3], hr: [0, 1, 1, 2, 4] },
  POR: { f: 'Tiago João Rúben Nuno Diogo Rafael Duarte Miguel André Bruno Gonçalo Ricardo Filipe Hélder', l: 'Almeida Ferreira Carvalho Teixeira Pinto Lopes Marques Moreira Correia Fonseca Cunha Barros Vieira Pacheco', sk: [0, 3], hr: [0, 1, 1, 2] },
  NED: { f: 'Daan Sven Lars Bram Jesse Thijs Ruben Niek Stijn Joris Tim Milan Koen Jelle', l: 'de_Vries van_Dijk Bakker Visser Smit Meijer de_Boer Mulder Bos Vos Peters Hendriks Dekker Brouwer', sk: [0, 2], hr: [2, 2, 1, 0, 3] },
  ITA: { f: 'Matteo Luca Marco Andrea Simone Davide Federico Riccardo Alessio Giacomo Lorenzo Nicola Stefano Emanuele', l: 'Ferrari Romano Colombo Ricci Marino Greco Bruno Gallo Conti De_Luca Mancini Costa Giordano Rinaldi', sk: [0, 2], hr: [0, 1, 1, 4] },
  MAR: { f: 'Yassine Amine Hamza Mehdi Karim Youssef Nabil Oussama Anas Ismail Zakaria Bilal Adil Reda', l: 'Benali Kabbaj Alaoui Idrissi Tazi Bennani Fassi Chraibi Lahlou Berrada Mansouri Ziani Saidi Haddad', sk: [2, 4], hr: [0, 0, 0, 1] },
  JPN: { f: 'Haruto Ren Sota Yuto Kaito Riku Daiki Shota Takumi Ryo Hayato Yuki', l: 'Tanaka Sato Suzuki Takahashi Ito Watanabe Yamamoto Nakamura Kobayashi Kato Kimura Hayashi', sk: [1, 2], hr: [0, 0, 0, 1] },
  KOR: { f: 'Min-jun Seo-jun Ji-ho Hyun-woo Joon-ho Tae-yang Sung-min Dong-hyun Jae-won Woo-jin Ji-hoon Kang-min', l: 'Kim Lee Park Choi Jung Kang Cho Yoon Jang Lim Han Shin', sk: [1, 2], hr: [0, 0, 0, 1] },
  USA: { f: 'Tyler Jordan Cody Austin Brandon Zach Ethan Mason Logan Caleb Trevor Dillon Colby Jake', l: 'Miller Johnson Carter Brooks Hayes Morgan Reed Bennett Cooper Sullivan Ellis Howard Nash Grant', sk: [0, 5], hr: [0, 1, 1, 2, 3, 4] },
  MEX: { f: 'Diego Santiago Emiliano Jesús Luis Ángel Ricardo Fernando Iván Óscar César Alan Erick Javier', l: 'Hernández García Martínez López Ramírez Torres Flores Morales Cruz Vargas Salazar Cervantes Mendoza Ibarra', sk: [1, 4], hr: [0, 0, 1, 1] },
  COL: { f: 'Juan Camilo Sebastián Andrés Jhon Duván Yeison Santiago Miguel Brayan Cristian Daniel Mateo', l: 'Rojas Cuesta Restrepo Ospina Valencia Cardona Mosquera Zapata Torres Giraldo Herrera Quintero Arango Mejía', sk: [1, 5], hr: [0, 0, 1, 1, 2] },
  URU: { f: 'Facundo Maximiliano Agustín Nicolás Rodrigo Federico Matías Santiago Joaquín Bruno Emiliano Gastón Lucas Brian', l: 'Techera Olivera Acevedo Rocha Núñez Píriz Viera Lemos Ferreira Correa Bermúdez Sequeira Barrios Cardozo', sk: [0, 3], hr: [0, 1, 1, 4] },
  BEL: { f: 'Thomas Lucas Robin Jonas Arne Wout Senne Maxim Yannick Dries Tim Bram Kobe Matteo', l: 'Peeters Janssens Maes Jacobs Mertens Willems Claes Goossens Wouters De_Smet Vermeulen Hermans Aerts Michiels', sk: [0, 3], hr: [1, 2, 2, 0, 4] },
  CRO: { f: 'Luka Ivan Marko Josip Mateo Filip Dario Nikola Petar Domagoj Karlo Antonio Borna Tomislav', l: 'Horvat Kovač Babić Marić Jurić Novak Knežević Vuković Perić Matić Pavlović Tomić Božić Šarić', sk: [0, 2], hr: [0, 1, 1, 2] },
  SUI: { f: 'Noah Luca Nico Fabian Dario Lars Jan Silvan Reto Marc Tim Livio Elias Dominik', l: 'Müller Meier Keller Brunner Baumann Frei Huber Steiner Gerber Fuchs Widmer Roth Moser Zürcher', sk: [0, 2], hr: [1, 1, 2, 0, 3] },
  DEN: { f: 'Mads Rasmus Emil Frederik Oliver Kasper Jens Lasse Simon Andreas Nikolaj Mikkel Magnus Christian', l: 'Jensen Nielsen Hansen Pedersen Andersen Christensen Larsen Sørensen Rasmussen Jørgensen Madsen Kristensen Olsen Thomsen', sk: [0, 1], hr: [2, 2, 1, 0, 3] },
  POL: { f: 'Kacper Jakub Mateusz Piotr Bartosz Michał Szymon Kamil Dawid Paweł Łukasz Filip Adrian Marcin', l: 'Kowalski Nowak Wiśniewski Wójcik Kamiński Kowalczyk Dąbrowski Mazur Krawczyk Piotrowski Grabowski Pawlak Michalski Zając', sk: [0, 1], hr: [1, 2, 2, 0, 3] },
  SRB: { f: 'Nemanja Stefan Luka Marko Filip Miloš Aleksa Uroš Dušan Lazar Vuk Nikola Ognjen Đorđe', l: 'Jovanović Petrović Nikolić Marković Đorđević Stojanović Ilić Pavlović Kostić Lazić Simić Tadić Božić Mitrović', sk: [0, 2], hr: [0, 1, 1, 4] },
  TUR: { f: 'Emre Burak Mert Yusuf Kerem Can Ozan Barış Efe Arda Enes Cem Hakan Berkay', l: 'Yılmaz Demir Kaya Şahin Çelik Aydın Öztürk Arslan Doğan Kılıç Aslan Koç Polat Erdem', sk: [1, 3], hr: [0, 0, 1, 1] },
  SEN: { f: 'Mamadou Ibrahima Cheikh Moussa Abdou Pape Idrissa Ousmane Lamine Boubacar Saliou Papis Youssouph Habib', l: 'Diop Ndiaye Fall Sow Diallo Gueye Sarr Mbaye Faye Seck Ba Camara Thiam Cissé', sk: [4, 5], hr: [0, 0, 0] },
  NGA: { f: 'Chinedu Emeka Tunde Segun Ifeanyi Obinna Chidi Uche Femi Ayo Nnamdi Tobenna Kunle Damola', l: 'Okafor Adeyemi Eze Balogun Okonkwo Nwosu Ogunleye Abubakar Ibrahim Onyeka Lawal Olawale Musa Udoh', sk: [4, 5], hr: [0, 0, 0] },
  GHA: { f: 'Kwame Kofi Yaw Kwesi Nana Abdul Ebenezer Emmanuel Isaac Samuel Prince Joseph Daniel Richmond', l: 'Mensah Owusu Boateng Asante Appiah Ofori Adjei Tetteh Amoah Quaye Acheampong Danso Badu Sarpong', sk: [4, 5], hr: [0, 0, 0] },
  EGY: { f: 'Mohamed Ahmed Omar Karim Mahmoud Youssef Hossam Tarek Amr Khaled Ali Mostafa Ibrahim Ramy', l: 'Hassan Ibrahim Salem Farouk Mansour Fathy Nasser Saad Abdelrahman Gamal Kamel Zaki Habib Shawky', sk: [2, 4], hr: [0, 0, 0, 1] },
  AUS: { f: 'Jack Ryan Jordan Riley Cooper Lachlan Mitchell Nathan Harrison Kyle Blake Callan Josh Connor', l: 'Smith Wilson Taylor Murphy Kelly Campbell Stewart Walsh Reid Harper Fraser Nolan Barnes Ford', sk: [0, 4], hr: [1, 1, 2, 3, 0] },
  CAN: { f: 'Liam Noah Ethan Mason Owen Jacob Logan Lucas Nathan Carter Ryan Jordan Tyler Evan', l: 'Tremblay Roy Gagnon Bouchard Campbell Mackenzie Wilson Fraser Cormier Leblanc Martin Bergeron Ross Murray', sk: [0, 4], hr: [0, 1, 1, 2, 3] },
  ECU: { f: 'Kevin Bryan Jhon Alan Romario Ángel Byron Carlos Pedro Luis Josué Denis Erick Jordy', l: 'Vera Mina Quiñónez Cifuentes Rodríguez Bolaños Cabezas Ayoví Cortez Mercado Valencia Ortiz Castillo Chalá', sk: [2, 5], hr: [0, 0, 1, 1] },
  SWE: { f: 'Erik Oscar Viktor Johan Emil Anton Filip Hampus Elias Axel Isak Albin Simon Gustav', l: 'Andersson Johansson Karlsson Nilsson Eriksson Larsson Olsson Persson Svensson Gustafsson Lindqvist Berg Holm Sandberg', sk: [0, 1], hr: [2, 2, 1, 0, 3] },
  CHI: { f: 'Benjamín Vicente Cristóbal Matías Felipe Ignacio Maximiliano Nicolás Diego Sebastián Joaquín Gonzalo Claudio Esteban', l: 'González Muñoz Rojas Díaz Pérez Soto Contreras Silva Martínez Sepúlveda Morales Fuentes Tapia Carrasco Vargas', sk: [1, 3], hr: [0, 0, 1, 1] }
};
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hashStr = str => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// 30 pemain per negara: 10 penyerang, 10 gelandang, 10 bek (dibuat deterministik agar ID stabil)
const STARS = [];
for (const t of TEAMS) {
  const rnd = mulberry(hashStr(t.code)), pool = NP[t.code], F = pool.f.split(' '), L = pool.l.split(' ');
  const list = [], used = new Set(), cnt = { FW: 10, MF: 10, DF: 10 };
  HAND.filter(h => h[0] === t.code).forEach(h => { list.push({ code: t.code, name: h[1], pos: h[2], spd: h[3], sht: h[4], tkl: h[5], skin: SKS[h[6]], hair: HRS[h[7]] }); used.add(h[1]); cnt[h[2]]--; });
  const posList = [];
  for (const r in cnt) for (let i = 0; i < cnt[r]; i++) posList.push(r);
  for (let i = posList.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [posList[i], posList[j]] = [posList[j], posList[i]]; }
  const b = 2.1 + (t.pow - 1) * .3;
  for (const pos of posList) {
    let name, tries = 0;
    do { name = F[Math.floor(rnd() * F.length)] + ' ' + L[Math.floor(rnd() * L.length)]; name = name.replace(/_/g, ' '); tries++; } while (used.has(name) && tries < 80);
    used.add(name);
    const bias = pos === 'FW' ? [.5, .8, -.8] : pos === 'DF' ? [0, -.8, .9] : [.2, .1, .1];
    const v = bias.map(x => clamp(Math.round(b + x + (rnd() - .5) * 2.4), 1, 5));
    const skin = SKS[pool.sk[0] + Math.floor(rnd() * (pool.sk[1] - pool.sk[0] + 1))], hair = HRS[pool.hr[Math.floor(rnd() * pool.hr.length)]];
    list.push({ code: t.code, name, pos, spd: v[0], sht: v[1], tkl: v[2], skin, hair });
  }
  list.sort((x, y) => (y.spd + y.sht + y.tkl) - (x.spd + x.sht + x.tkl) || (x.name < y.name ? -1 : 1));
  list.forEach((pl, i) => { pl.id = t.code + i; pl.price = Math.max(150, (pl.spd + pl.sht + pl.tkl - 5) * 110); STARS.push(pl); });
}
const STAR = Object.fromEntries(STARS.map(x => [x.id, x]));
const posName = p => p === 'FW' ? 'Penyerang' : p === 'MF' ? 'Gelandang' : 'Bek';

/* ---------------- Warna ---------------- */
const hex2 = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const cdist = (a, b) => { const x = hex2(a), y = hex2(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
const shade = (c, f) => '#' + hex2(c).map(v => clamp(Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f), 0, 255).toString(16).padStart(2, '0')).join('');
const lum = c => { const x = hex2(c); return (x[0] * 299 + x[1] * 587 + x[2] * 114) / 1000; };
const textOn = c => lum(c) > 150 ? '#0b0630' : '#ffffff';
const mkKit = (c1, c2, c3) => ({ c1, c2, c3, d: cdist(c2, c1) > cdist(c3, c1) ? c2 : c3 });
function pickKits(myCode, oppCode) {
  const A = TEAM[myCode]; let B = TEAM[oppCode];
  if (B.code === A.code) B = TEAMS.find(t => t.code !== A.code);
  let kb = mkKit(B.k[0], B.k[1], B.k[2]);
  const alt = mkKit(B.k[1], B.k[0], B.k[2]);
  if (cdist(kb.c1, A.k[0]) < 130 && cdist(alt.c1, A.k[0]) > cdist(kb.c1, A.k[0])) kb = alt;
  if (cdist(kb.c1, A.k[0]) < 90) kb = mkKit('#ff3fd2', '#7a1fff', '#22e6ff');
  return [mkKit(A.k[0], A.k[1], A.k[2]), kb, A, B];
}

/* ---------------- Data pemain (tersimpan) ---------------- */
const KEY = 'neonStriker.v1';
const P = { coins: 800, owned: [], squad: [], team: 'IDN', opp: 'BRA', form: '2-2', names: {}, lg: null, wc: null };
try {
  const r = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (r && typeof r === 'object') Object.assign(P, r);
} catch (e) {}
if (!TEAM[P.team]) P.team = 'IDN';
if (!TEAM[P.opp] || P.opp === P.team) P.opp = TEAMS.find(t => t.code !== P.team).code;
if (!FORMS[P.form]) P.form = '2-2';
const legacyId = id => { if (!/^s\d+$/.test(id)) return id; const h = HAND[+id.slice(1)]; const x = h && STARS.find(q => q.code === h[0] && q.name === h[1]); return x ? x.id : null; };
P.owned = (P.owned || []).map(legacyId).filter(Boolean); P.squad = (P.squad || []).map(legacyId).filter(Boolean);
if (P.names && typeof P.names === 'object') { const nn = {}; for (const id in P.names) { const k = legacyId(id); if (k) nn[k] = P.names[id]; } P.names = nn; }
P.owned = P.owned.filter(id => STAR[id]); P.squad = (P.squad || []).filter(id => P.owned.includes(id)).slice(0, 2);
P.coins = Math.max(0, Math.floor(+P.coins || 0));
P.names = (P.names && typeof P.names === 'object') ? P.names : {};
for (const id in P.names) if (STAR[id]) STAR[id].name = String(P.names[id]).slice(0, 18);
function saveP() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
function renderCoins() { $$('[data-coins]').forEach(el => { el.textContent = P.coins; }); }
let toastT = 0;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1900); }
const starObjs = () => P.squad.map(id => STAR[id]).filter(Boolean);
function assignStars(slots, stars) {
  const res = new Array(slots.length).fill(null);
  const order = slots.map((_, i) => i).sort((a, b) => slots[b][0] - slots[a][0]);
  for (const st of stars) {
    const seq = st.pos === 'FW' ? order : st.pos === 'DF' ? order.slice().reverse() : slots.map((_, i) => i).sort((a, b) => Math.abs(slots[a][0] - .35) - Math.abs(slots[b][0] - .35));
    const i = seq.find(k => !res[k]);
    if (i !== undefined) res[i] = st;
  }
  return res;
}

/* ---------------- UI: tim, formasi, toko ---------------- */
const crest = (t, size) => '<span class="crest" style="background:' + t.k[0] + ';border-color:' + t.k[1] + ';color:' + textOn(t.k[0]) + (size ? ';width:' + size + 'px;height:' + size + 'px' : '') + '">' + t.code + '</span>';
const stars5 = n => '★'.repeat(n) + '☆'.repeat(5 - n);
let teamSide = 0;
function renderTeams() {
  const A = TEAM[P.team], B = TEAM[P.opp];
  $('#vsA').innerHTML = crest(A) + '<span>' + A.name + '</span>';
  $('#vsB').innerHTML = crest(B) + '<span>' + B.name + '</span>';
  $('#vsA').classList.toggle('act', teamSide === 0); $('#vsB').classList.toggle('act', teamSide === 1);
  $$('#teamSide button').forEach(b => b.classList.toggle('sel', +b.dataset.v === teamSide));
  const cur = teamSide === 0 ? P.team : P.opp, other = teamSide === 0 ? P.opp : P.team;
  $('#teamGrid').innerHTML = TEAMS.map(t => '<button class="tcard' + (t.code === cur ? ' sel' : '') + (t.code === other ? ' dis' : '') + '" data-c="' + t.code + '">' + crest(t) + '<span>' + t.name + '</span><small>' + stars5(t.pow) + '</small></button>').join('');
}
$('#teamGrid').addEventListener('click', e => {
  const b = e.target.closest('.tcard'); if (!b || b.classList.contains('dis')) return;
  if (teamSide === 0) { P.team = b.dataset.c; teamSide = 1; } else P.opp = b.dataset.c;
  saveP(); renderTeams();
});
$('#teamSide').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; teamSide = +b.dataset.v; renderTeams(); });
$('#vsA').addEventListener('click', () => { teamSide = 0; renderTeams(); });
$('#vsB').addEventListener('click', () => { teamSide = 1; renderTeams(); });

function formSVG() {
  const f = FORMS[P.form], as = assignStars(f.slots, starObjs()), A = TEAM[P.team];
  const dot = (x, y, fill, stroke, lbl) => '<circle cx="' + x + '" cy="' + y + '" r="6.6" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (lbl ? 2.2 : 1.4) + '"/>' + (lbl ? '<text x="' + x + '" y="' + (y + 2.6) + '" text-anchor="middle" font-size="8" font-weight="700" fill="#3a2600">★</text>' : '');
  let g = '';
  f.slots.forEach((sl, i) => { g += dot(sl[0] * 160, sl[1] * 100, A.k[0], as[i] ? '#ffd23c' : A.k[1], as[i] ? 1 : 0); });
  return '<svg id="formSvg" viewBox="0 0 160 100" role="img" aria-label="Susunan pemain formasi ' + P.form + '"><rect width="160" height="100" fill="#0c4456"/><rect x="0" width="20" height="100" fill="rgba(255,255,255,.04)"/><rect x="40" width="20" height="100" fill="rgba(255,255,255,.04)"/><rect x="80" width="20" height="100" fill="rgba(255,255,255,.04)"/><rect x="120" width="20" height="100" fill="rgba(255,255,255,.04)"/>'
    + '<g fill="none" stroke="rgba(235,250,255,.75)" stroke-width="1"><rect x="2" y="2" width="156" height="96"/><line x1="80" y1="2" x2="80" y2="98"/><circle cx="80" cy="50" r="13"/><rect x="2" y="26" width="24" height="48"/><rect x="134" y="26" width="24" height="48"/></g>'
    + dot(9, 50, '#c8ff3a', '#3aa000', 0) + g + '<text x="156" y="96" text-anchor="end" font-size="6" fill="rgba(255,255,255,.6)">arah serangan →</text></svg>';
}
function renderLineup() {
  const dest = lineupFrom === 'ev' ? 'evdetail' : lineupFrom === 'online' ? 'online' : null, fe = !!dest;
  $('#lnBack').dataset.go = dest || 'teams'; $('#lnNext').dataset.go = dest || 'match';
  $('#lnNext').textContent = fe ? 'Simpan skuad' : 'Lanjut: Pengaturan'; $('#lnSteps').style.display = fe ? 'none' : '';
  $('#formPrev').innerHTML = formSVG();
  $('#formRow').innerHTML = Object.keys(FORMS).map(k => '<button class="chip' + (k === P.form ? ' sel' : '') + '" data-f="' + k + '">' + k + '</button>').join('');
  $('#formDesc').innerHTML = '<b>' + FORMS[P.form].name + '.</b> ' + FORMS[P.form].desc;
  const own = P.owned.map(id => STAR[id]);
  $('#squadList').innerHTML = own.length
    ? '<div class="chips">' + own.map(st => '<button class="chip' + (P.squad.includes(st.id) ? ' sel' : '') + '" data-s="' + st.id + '">' + st.name + ' <small>' + st.code + ' · ' + st.pos + '</small></button>').join('') + '</div>'
    : '<p class="hint">Kamu belum punya pemain bintang. Beli di toko untuk memperkuat tim.</p><button class="chip" data-go="shop">Buka toko</button>';
}
$('#formRow').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; P.form = b.dataset.f; saveP(); renderLineup(); });
$('#squadList').addEventListener('click', e => {
  const b = e.target.closest('[data-s]'); if (!b) return;
  const id = b.dataset.s, i = P.squad.indexOf(id);
  if (i >= 0) P.squad.splice(i, 1);
  else { if (P.squad.length >= 2) { toast('Maksimal 2 pemain bintang. Lepas salah satu dulu.'); return; } P.squad.push(id); }
  saveP(); renderLineup();
});

function avatar(st) {
  const k = TEAM[st.code].k;
  return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 64c0-15 10-23 24-23s24 8 24 23z" fill="' + k[0] + '"/><path d="M24 42l8 9 8-9" fill="none" stroke="' + shade(k[2], 0) + '" stroke-width="3.5" stroke-linejoin="round"/><rect x="27" y="33" width="10" height="11" rx="4" fill="' + st.skin + '"/><circle cx="32" cy="26" r="12" fill="' + st.skin + '"/><path d="M20 26c-1-10 6-15 12-15s13 5 12 15c-3-5-7-7-12-7s-9 2-12 7z" fill="' + st.hair + '"/><circle cx="27.5" cy="28" r="1.5" fill="#1b1240"/><circle cx="36.5" cy="28" r="1.5" fill="#1b1240"/></svg>';
}
const statRow = (label, n) => '<div class="stat"><span>' + label + '</span><em>' + [1, 2, 3, 4, 5].map(i => '<i class="' + (i <= n ? 'on' : '') + '"></i>').join('') + '</em></div>';
let shopTab = 'OWN', shopPos = 'ALL';
function renderShop() {
  const tabs = [['OWN', 'Dimiliki']].concat(TEAMS.map(t => [t.code, t.name]));
  $('#shopTabs').innerHTML = tabs.map(t => '<button class="chip' + (t[0] === shopTab ? ' sel' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>').join('');
  $('#shopPos').innerHTML = [['ALL', 'Semua'], ['FW', 'Penyerang'], ['MF', 'Gelandang'], ['DF', 'Bek']].map(t => '<button class="chip' + (t[0] === shopPos ? ' sel' : '') + '" data-p="' + t[0] + '">' + t[1] + '</button>').join('');
  const base = STARS.filter(x => shopTab === 'OWN' ? P.owned.includes(x.id) : x.code === shopTab);
  const list = base.filter(x => shopPos === 'ALL' || x.pos === shopPos);
  const ownedN = base.filter(x => P.owned.includes(x.id)).length;
  $('#shopCount').textContent = shopTab === 'OWN' ? P.owned.length + ' pemain dimiliki' : base.length + ' pemain · ' + ownedN + ' dimiliki';
  $('#shopGrid').innerHTML = list.length ? list.map(st => {
    const own = P.owned.includes(st.id), t = TEAM[st.code];
    return '<div class="scard' + (own ? ' owned' : '') + '"><div class="av">' + avatar(st) + '</div><div class="sinfo"><b>' + st.name + '</b><div class="m2">' + crest(t) + '<span>' + t.name + ' · ' + posName(st.pos) + '</span></div>'
      + statRow('Kecepatan', st.spd) + statRow('Tembakan', st.sht) + statRow('Tekel', st.tkl)
      + (own ? '<span class="buy own">Dimiliki ✓</span> <button class="buy" data-ren="' + st.id + '">Ubah nama</button>' : '<button class="buy' + (P.coins < st.price ? ' dim' : '') + '" data-id="' + st.id + '"><i></i>Beli · ' + st.price + '</button>') + '</div></div>';
  }).join('') : '<p class="hint">' + (shopTab === 'OWN' ? 'Kamu belum memiliki pemain di kategori ini. Pilih negara di atas untuk mulai berbelanja.' : 'Tidak ada pemain di kategori ini.') + '</p>';
}
$('#shopTabs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; shopTab = b.dataset.t; renderShop(); });
$('#shopPos').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; shopPos = b.dataset.p; renderShop(); });
function startRename(id, card) {
  const holder = card.querySelector('.sinfo b'); if (!holder) return;
  holder.innerHTML = '<input class="rn" maxlength="18" aria-label="Nama pemain">';
  const inp = holder.querySelector('input'); inp.value = STAR[id].name; inp.focus(); inp.select();
  let done = false;
  const finish = save => {
    if (done) return; done = true;
    const v = inp.value.replace(/[<>&"]/g, '').trim().slice(0, 18);
    if (save && v) { STAR[id].name = v; P.names[id] = v; saveP(); toast('Nama diubah menjadi ' + v); }
    renderShop();
  };
  inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') finish(true); else if (ev.key === 'Escape') finish(false); });
  inp.addEventListener('blur', () => finish(true));
}
$('#shopGrid').addEventListener('click', e => {
  const r = e.target.closest('[data-ren]'); if (r) { startRename(r.dataset.ren, r.closest('.scard')); return; }
  const b = e.target.closest('[data-id]'); if (!b) return;
  const st = STAR[b.dataset.id]; if (!st || P.owned.includes(st.id)) return;
  if (P.coins < st.price) { toast('Koin belum cukup. Main pertandingan untuk mendapat koin.'); return; }
  P.coins -= st.price; P.owned.push(st.id);
  const inSquad = P.squad.length < 2; if (inSquad) P.squad.push(st.id);
  saveP(); renderCoins(); renderShop();
  toast(st.name + ' bergabung' + (inSquad ? ' ke skuadmu' : '. Pasang lewat menu Formasi'));
});

/* ---------------- Event: liga dan piala dunia ---------------- */
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pois = l => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };
const simScore = (a, b) => { const d = TEAM[a].pow - TEAM[b].pow; return [pois(clamp(1.25 + d * .28, .35, 3)), pois(clamp(1.25 - d * .28, .35, 3))]; };
function simKO(a, b) {
  const [x, y] = simScore(a, b); let w = x > y ? a : b, pens = false;
  if (x === y) { pens = true; w = Math.random() < .5 + (TEAM[a].pow - TEAM[b].pow) * .05 ? a : b; }
  return { a, b, x, y, w, pens };
}
const blank = () => ({ p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
function addRes(t, a, x, b, y) {
  const A = t[a], B = t[b]; A.p++; B.p++; A.gf += x; A.ga += y; B.gf += y; B.ga += x;
  if (x > y) { A.w++; A.pts += 3; B.l++; } else if (x < y) { B.w++; B.pts += 3; A.l++; } else { A.d++; B.d++; A.pts++; B.pts++; }
}
const rank = (codes, t) => codes.slice().sort((a, b) => t[b].pts - t[a].pts || (t[b].gf - t[b].ga) - (t[a].gf - t[a].ga) || t[b].gf - t[a].gf || (a < b ? -1 : 1));

function newLeague() {
  const me = P.team, teams = [me].concat(shuffle(TEAMS.filter(t => t.code !== me)).slice(0, 7).map(t => t.code));
  const arr = teams.slice(), rounds = [];
  for (let r = 0; r < 7; r++) { const fx = []; for (let i = 0; i < 4; i++) fx.push([arr[i], arr[7 - i]]); rounds.push(fx); arr.splice(1, 0, arr.pop()); }
  const table = {}; teams.forEach(c => { table[c] = blank(); });
  return { type: 'lg', me, teams, rounds, round: 0, table, last: null, done: false, place: 0, prize: 0 };
}
function lgNext(ev) { if (ev.done) return null; const f = ev.rounds[ev.round].find(x => x.includes(ev.me)); return f[0] === ev.me ? f[1] : f[0]; }
function lgRecord(ev, my, op) {
  const opp = lgNext(ev);
  for (const [a, b] of ev.rounds[ev.round]) {
    let x, y;
    if (a === ev.me) { x = my; y = op; } else if (b === ev.me) { x = op; y = my; } else { [x, y] = simScore(a, b); }
    addRes(ev.table, a, x, b, y);
  }
  ev.last = { opp, my, op };
  ev.round++;
  if (ev.round >= 7) { ev.done = true; ev.place = rank(ev.teams, ev.table).indexOf(ev.me) + 1; ev.prize = [1000, 500, 250][ev.place - 1] || 50; P.coins += ev.prize; }
}

const GRP_FX = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
const WC_PRIZE = { group: 100, qf: 300, sf: 600, final: 1200, champ: 2500 };
const WC_LABEL = { group: 'Tersingkir di babak grup', qf: 'Perempat final', sf: 'Semifinal', final: 'Runner-up', champ: 'Juara Piala Dunia' };
function newWC() {
  const me = P.team, all = shuffle([me].concat(shuffle(TEAMS.filter(t => t.code !== me)).slice(0, 15).map(t => t.code)));
  const groups = [0, 1, 2, 3].map(g => all.slice(g * 4, g * 4 + 4)), table = {}; all.forEach(c => { table[c] = blank(); });
  return { type: 'wc', me, groups, table, round: 0, stage: 'group', ko: { qf: [], sf: [], final: [] }, alive: true, done: false, place: '', prize: 0, last: null, champ: null, exit: null };
}
function wcStageName(ev) { return { group: 'Babak grup · laga ' + (ev.round + 1), qf: 'Perempat final', sf: 'Semifinal', final: 'Final', done: 'Selesai' }[ev.stage]; }
function wcNext(ev) {
  if (ev.done || !ev.alive) return null;
  if (ev.stage === 'group') {
    const g = ev.groups.find(x => x.includes(ev.me));
    for (const [i, j] of GRP_FX[ev.round]) { if (g[i] === ev.me) return g[j]; if (g[j] === ev.me) return g[i]; }
    return null;
  }
  const m = ev.ko[ev.stage].find(x => x.a === ev.me || x.b === ev.me);
  return m ? (m.a === ev.me ? m.b : m.a) : null;
}
function wcBuild(ev, from) {
  if (from === 'group') {
    const q = ev.groups.map(g => rank(g, ev.table));
    ev.ko.qf = [[q[0][0], q[1][1]], [q[1][0], q[0][1]], [q[2][0], q[3][1]], [q[3][0], q[2][1]]].map(([a, b]) => ({ a, b })); ev.stage = 'qf';
  } else if (from === 'qf') { const w = ev.ko.qf.map(m => m.w); ev.ko.sf = [{ a: w[0], b: w[1] }, { a: w[2], b: w[3] }]; ev.stage = 'sf'; }
  else if (from === 'sf') { const w = ev.ko.sf.map(m => m.w); ev.ko.final = [{ a: w[0], b: w[1] }]; ev.stage = 'final'; }
  else { ev.champ = ev.ko.final[0].w; ev.stage = 'done'; }
}
function wcResolve(ev) {
  let guard = 0;
  while (ev.stage !== 'done' && guard++ < 10) {
    if (ev.stage === 'group') {
      while (ev.round < 3) { ev.groups.forEach(g => { for (const [i, j] of GRP_FX[ev.round]) { const [x, y] = simScore(g[i], g[j]); addRes(ev.table, g[i], x, g[j], y); } }); ev.round++; }
      wcBuild(ev, 'group');
    } else { ev.ko[ev.stage].forEach(m => { if (m.w === undefined) Object.assign(m, simKO(m.a, m.b)); }); wcBuild(ev, ev.stage); }
  }
  const key = ev.champ === ev.me ? 'champ' : (ev.exit || 'final');
  ev.done = true; ev.place = WC_LABEL[key]; ev.prize = WC_PRIZE[key]; P.coins += ev.prize;
}
function wcRecord(ev, my, op, penWin) {
  const opp = wcNext(ev), stage = ev.stage;
  if (stage === 'group') {
    ev.groups.forEach(g => {
      for (const [i, j] of GRP_FX[ev.round]) {
        const a = g[i], b = g[j]; let x, y;
        if (a === ev.me) { x = my; y = op; } else if (b === ev.me) { x = op; y = my; } else { [x, y] = simScore(a, b); }
        addRes(ev.table, a, x, b, y);
      }
    });
    ev.last = { opp, my, op }; ev.round++;
    if (ev.round >= 3) { wcBuild(ev, 'group'); if (!ev.ko.qf.some(m => m.a === ev.me || m.b === ev.me)) { ev.alive = false; ev.exit = 'group'; } }
  } else {
    ev.last = { opp, my, op, pens: my === op };
    let lost = false;
    ev.ko[stage].forEach(m => {
      if (m.a === ev.me || m.b === ev.me) {
        const mine = m.a === ev.me, x = mine ? my : op, y = mine ? op : my;
        m.x = x; m.y = y; m.pens = x === y;
        m.w = x > y ? m.a : x < y ? m.b : (penWin ? ev.me : (mine ? m.b : m.a));
        if (m.w !== ev.me) lost = true;
      } else Object.assign(m, simKO(m.a, m.b));
    });
    if (lost) { ev.alive = false; ev.exit = stage; }
    wcBuild(ev, stage);
  }
  if (!ev.alive || ev.stage === 'done') wcResolve(ev);
}
function evOnMatchEnd(kind, a, b, penWin) {
  const ev = P[kind]; if (!ev || ev.done) return 0;
  if (kind === 'lg') lgRecord(ev, a, b); else wcRecord(ev, a, b, penWin);
  saveP(); renderCoins();
  return ev.done ? ev.prize : 0;
}
function evLabel(kind) { const ev = P[kind]; return kind === 'lg' ? 'Liga · pekan ' + (ev.round + 1) : 'Piala Dunia · ' + wcStageName(ev); }

/* UI event */
let evKind = 'lg', evGroup = -1, lineupFrom = 'match', resetArm = 0;
const EVN = { lg: 'Liga 8 Tim', wc: 'Piala Dunia 16 Tim' };
function evStatus(kind) {
  const ev = P[kind]; if (!ev) return 'Belum dimulai';
  if (ev.done) return 'Selesai · ' + (kind === 'lg' ? 'peringkat ' + ev.place : ev.place);
  return 'Berjalan · ' + (kind === 'lg' ? 'pekan ' + (ev.round + 1) + ' dari 7' : wcStageName(ev));
}
function renderEvents() { $('#evLgSub').textContent = evStatus('lg'); $('#evWcSub').textContent = evStatus('wc'); }
function tblHTML(codes, table, me) {
  const r = rank(codes, table);
  return '<table class="tbl"><tr><th>#</th><th class="l">Tim</th><th>Main</th><th>M</th><th>S</th><th>K</th><th>SG</th><th>Poin</th></tr>' + r.map((c, i) => {
    const t = table[c];
    return '<tr' + (c === me ? ' class="me"' : '') + '><td>' + (i + 1) + '</td><td class="l">' + crest(TEAM[c]) + '<span>' + TEAM[c].name + '</span></td><td>' + t.p + '</td><td>' + t.w + '</td><td>' + t.d + '</td><td>' + t.l + '</td><td>' + (t.gf - t.ga) + '</td><td><b>' + t.pts + '</b></td></tr>';
  }).join('') + '</table>';
}
function nextCard(ev, opp, label) {
  return '<div class="nextm"><small>' + label + '</small><div class="vs2">' + crest(TEAM[ev.me], 44) + '<b>vs</b>' + crest(TEAM[opp], 44) + '</div><span>' + TEAM[ev.me].name + ' vs ' + TEAM[opp].name + '</span></div>';
}
function koHTML(ev) {
  const names = { qf: 'Perempat final', sf: 'Semifinal', final: 'Final' };
  return ['qf', 'sf', 'final'].filter(k => ev.ko[k].length).map(k => '<h3>' + names[k] + '</h3>' + ev.ko[k].map(m => {
    const me = m.a === ev.me || m.b === ev.me;
    return '<div class="mrow' + (me ? ' me' : '') + '"><span class="' + (m.w === m.a ? 'w' : '') + '">' + TEAM[m.a].name + '</span><b>' + (m.w === undefined ? 'vs' : m.x + ' - ' + m.y + (m.pens ? ' (pen)' : '')) + '</b><span class="' + (m.w === m.b ? 'w' : '') + '">' + TEAM[m.b].name + '</span></div>';
  }).join('')).join('');
}
function lastHTML(ev) {
  if (!ev.last) return '';
  return '<p class="hint">Hasil terakhir: <b>' + TEAM[ev.me].name + ' ' + ev.last.my + ' - ' + ev.last.op + ' ' + TEAM[ev.last.opp].name + '</b>' + (ev.last.pens ? ' (adu penalti)' : '') + '</p>';
}
function renderEvDetail() {
  const kind = evKind, ev = P[kind]; $('#evTitle').textContent = EVN[kind];
  let h = '', play = '', canReset = false;
  if (!ev) {
    h = '<p class="hint">' + (kind === 'lg'
      ? '8 tim bertanding satu kali melawan setiap tim selama 7 pekan. Juara mendapat 1000 koin, peringkat 2 mendapat 500, dan peringkat 3 mendapat 250.'
      : '16 tim dibagi ke 4 grup. Dua terbaik tiap grup lolos ke perempat final, lalu semifinal dan final. Juara mendapat 2500 koin.') + '</p><p class="hint">Tim yang dipakai: <b>' + TEAM[P.team].name + '</b> (pilih di menu Pertandingan). Lawan dan grup diundi acak.</p>';
    play = 'Mulai event';
  } else if (ev.done) {
    h = '<div class="nextm"><b>' + (kind === 'lg' ? 'Peringkat ' + ev.place : ev.place) + '</b><span>Hadiah +' + ev.prize + ' koin sudah masuk</span></div>' + (kind === 'lg' ? tblHTML(ev.teams, ev.table, ev.me) : koHTML(ev));
    play = 'Mulai event baru';
  } else {
    canReset = true;
    const opp = kind === 'lg' ? lgNext(ev) : wcNext(ev);
    if (kind === 'lg') {
      h = nextCard(ev, opp, 'Pekan ' + (ev.round + 1) + ' dari 7') + lastHTML(ev) + tblHTML(ev.teams, ev.table, ev.me);
    } else if (ev.stage === 'group') {
      const mine = ev.groups.findIndex(g => g.includes(ev.me)), gi = evGroup < 0 ? mine : evGroup;
      h = nextCard(ev, opp, wcStageName(ev)) + lastHTML(ev) + '<div class="chips">' + ev.groups.map((g, i) => '<button class="chip' + (i === gi ? ' sel' : '') + '" data-eg="' + i + '">Grup ' + 'ABCD'[i] + '</button>').join('') + '</div>' + tblHTML(ev.groups[gi], ev.table, ev.me);
    } else {
      h = nextCard(ev, opp, wcStageName(ev)) + lastHTML(ev) + koHTML(ev);
    }
    play = 'Main melawan ' + TEAM[opp].name;
  }
  $('#evBody').innerHTML = h; $('#evPlay').textContent = play;
  $('#evReset').style.display = canReset ? '' : 'none'; $('#evReset').textContent = 'Batalkan event'; resetArm = 0;
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-ev]'); if (b && $('#events').classList.contains('active')) { evKind = b.dataset.ev; evGroup = -1; show('evdetail'); return; }
  const g = e.target.closest && e.target.closest('[data-eg]'); if (g) { evGroup = +g.dataset.eg; renderEvDetail(); }
});
$('#evPlay').addEventListener('click', () => {
  const ev = P[evKind];
  if (!ev || ev.done) { P[evKind] = evKind === 'lg' ? newLeague() : newWC(); saveP(); evGroup = -1; renderEvDetail(); return; }
  const opp = evKind === 'lg' ? lgNext(ev) : wcNext(ev);
  if (!opp) { renderEvDetail(); return; }
  startGame('match', null, { event: evKind, opp });
});
$('#evLineup').addEventListener('click', () => { lineupFrom = 'ev'; show('lineup'); });
$('#evReset').addEventListener('click', () => {
  if (resetArm) { P[evKind] = null; saveP(); resetArm = 0; renderEvDetail(); return; }
  resetArm = 1; $('#evReset').textContent = 'Tekan lagi untuk menghapus';
  setTimeout(() => { if (resetArm) { resetArm = 0; $('#evReset').textContent = 'Batalkan event'; } }, 2500);
});

const onShow = { lobby: () => { renderCoins(); if (!G) netLeave(); }, online: onlineShow, teams: () => { lineupFrom = 'match'; renderTeams(); }, lineup: renderLineup, shop: () => { renderCoins(); if (shopTab === 'OWN' && !P.owned.length) shopTab = P.team; renderShop(); }, events: renderEvents, evdetail: renderEvDetail };
renderCoins();

/* ---------------- Navigasi layar ---------------- */
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); if (onShow[id]) onShow[id](); }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-go]'); if (b) show(b.dataset.go); });

function syncSeg() {
  $$('.seg[data-key]').forEach(seg => {
    const k = seg.dataset.key;
    const cur = k === 'sound' ? (S.sound ? '1' : '0') : String(S[k]);
    seg.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === cur));
  });
}
$$('.seg[data-key] button').forEach(b => b.addEventListener('click', () => {
  const k = b.parentElement.dataset.key;
  S[k] = k === 'sound' ? b.dataset.v === '1' : parseFloat(b.dataset.v);
  syncSeg();
  if (k === 'gfx') buildPitch();
  if (k === 'view') applyView();
}));
syncSeg();

/* ---------------- Input ---------------- */
const input = { jx: 0, jy: 0, kx: 0, ky: 0, shootHeld: false, shootEdge: false, passEdge: false, lobEdge: false, tackleEdge: false, sprint: false, switchEdge: false };
const keys = {};
const input2 = { jx: 0, jy: 0, kx: 0, ky: 0, shootHeld: false, shootEdge: false, passEdge: false, lobEdge: false, tackleEdge: false, sprint: false, switchEdge: false };
const newRemote = () => ({ jx: 0, jy: 0, kx: 0, ky: 0, shootHeld: false, shootEdge: false, passEdge: false, lobEdge: false, tackleEdge: false, sprint: false, switchEdge: false });
function clearInput() {
  input.jx = input.jy = 0; input.shootHeld = input.shootEdge = input.passEdge = input.lobEdge = input.tackleEdge = input.sprint = input.switchEdge = false; input.sprintBtn = false;
  Object.assign(input2, { jx: 0, jy: 0, kx: 0, ky: 0, shootHeld: false, shootEdge: false, passEdge: false, lobEdge: false, tackleEdge: false, sprint: false, switchEdge: false });
  for (const k in keys) keys[k] = false;
  $('#joyBase').style.display = 'none';
  jid = null;
  $$('.abtn').forEach(b => b.classList.remove('on'));
}
window.addEventListener('keydown', e => {
  if (!G) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'KeyP' || e.code === 'Escape') { G.paused ? resume() : pause(); return; }
  if (G.paused) return;
  if (e.code === 'KeyJ' || e.code === 'Space') input.passEdge = true;
  if (e.code === 'KeyK') { input.shootEdge = true; input.shootHeld = true; }
  if (e.code === 'KeyL') input.switchEdge = true;
  if (e.code === 'KeyI') input.lobEdge = true;
  if (e.code === 'KeyO') input.tackleEdge = true;
  if (e.code === 'KeyR' && G.mode === 'train') resetBall();
  if (G.local2p) {
    if (e.code === 'Comma') input2.passEdge = true;
    if (e.code === 'Period') { input2.shootEdge = true; input2.shootHeld = true; }
    if (e.code === 'Slash') input2.lobEdge = true;
    if (e.code === 'KeyM') input2.tackleEdge = true;
    if (e.code === 'KeyN') input2.switchEdge = true;
  }
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'KeyK') input.shootHeld = false;
  if (e.code === 'Period') input2.shootHeld = false;
});
function readKeys() {
  const two = G && G.local2p;
  const axis = (l, r, u, d) => {
    let x = 0, y = 0; if (keys[l]) x -= 1; if (keys[r]) x += 1; if (keys[u]) y -= 1; if (keys[d]) y += 1;
    const n = Math.hypot(x, y); if (n > 1) { x /= n; y /= n; } return [x, y];
  };
  let [x, y] = axis('KeyA', 'KeyD', 'KeyW', 'KeyS');
  if (!two) { const a = axis('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'); x += a[0]; y += a[1]; const n = Math.hypot(x, y); if (n > 1) { x /= n; y /= n; } }
  input.kx = x; input.ky = y;
  input.sprint = !!(input.sprintBtn || keys.ShiftLeft || (!two && keys.ShiftRight));
  if (two) { const a = axis('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'); input2.kx = a[0]; input2.ky = a[1]; input2.sprint = !!keys.ShiftRight; }
}

// Joystick melayang
const jz = $('#joyZone'), jb = $('#joyBase'), jk = $('#joyKnob');
const rotated = () => typeof matchMedia === 'function' && matchMedia('(orientation:portrait) and (pointer:coarse)').matches;
const lc = e => rotated() ? { x: e.clientY, y: window.innerWidth - e.clientX } : { x: e.clientX, y: e.clientY };
let jid = null, jo = { x: 0, y: 0 };
const JR = 54;
jz.addEventListener('pointerdown', e => {
  if (jid !== null) return;
  jid = e.pointerId; jz.setPointerCapture(e.pointerId);
  jo = lc(e);
  jb.style.display = 'block'; jb.style.left = jo.x + 'px'; jb.style.top = jo.y + 'px';
  jk.style.transform = 'translate(0,0)';
  e.preventDefault();
});
jz.addEventListener('pointermove', e => {
  if (e.pointerId !== jid) return;
  const pt = lc(e);
  let dx = pt.x - jo.x, dy = pt.y - jo.y; const d = Math.hypot(dx, dy);
  if (d > JR) { // joystick mengikuti jari agar tidak kaku
    const ex = d - JR; jo.x += dx / d * ex; jo.y += dy / d * ex;
    jb.style.left = jo.x + 'px'; jb.style.top = jo.y + 'px';
    dx = pt.x - jo.x; dy = pt.y - jo.y;
  }
  const dd = Math.hypot(dx, dy) || 1;
  let m = Math.min(1, dd / JR); m = Math.max(0, (m - .1) / .9); m = Math.pow(m, 1.15);
  input.jx = dx / dd * m; input.jy = dy / dd * m;
  jk.style.transform = `translate(${dx / dd * Math.min(dd, JR)}px,${dy / dd * Math.min(dd, JR)}px)`;
});
const jEnd = e => { if (e.pointerId !== jid) return; jid = null; input.jx = input.jy = 0; jb.style.display = 'none'; };
jz.addEventListener('pointerup', jEnd); jz.addEventListener('pointercancel', jEnd);

function bindBtn(el, down, up) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('on'); down && down(); });
  const end = () => { el.classList.remove('on'); up && up(); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
bindBtn($('#btnShoot'), () => { input.shootEdge = true; input.shootHeld = true; }, () => { input.shootHeld = false; });
bindBtn($('#btnPass'), () => { input.passEdge = true; });
bindBtn($('#btnSprint'), () => { input.sprintBtn = true; }, () => { input.sprintBtn = false; });
bindBtn($('#btnSwitch'), () => { input.switchEdge = true; });
bindBtn($('#btnLob'), () => { input.lobEdge = true; });
bindBtn($('#btnTackle'), () => { input.tackleEdge = true; });
['gesturestart', 'contextmenu'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));

/* ---------------- Pitch (pra-render) ---------------- */
let pitch = null, pitchF = 1, pitchTex = null;
function buildPitch() {
  pitchF = [1, 1.25, 1.5][S.gfx];
  const pc = document.createElement('canvas');
  pc.width = Math.ceil((W + 2 * MG) * pitchF); pc.height = Math.ceil((H + 2 * MG) * pitchF);
  const c = pc.getContext('2d'); c.scale(pitchF, pitchF); c.translate(MG, MG);
  // latar neon
  let g = c.createLinearGradient(-MG, -MG, W + MG, H + MG);
  g.addColorStop(0, '#0a0533'); g.addColorStop(.5, '#1d0c5e'); g.addColorStop(1, '#0a0533');
  c.fillStyle = g; c.fillRect(-MG, -MG, W + 2 * MG, H + 2 * MG);
  const cols = ['#22e6ff', '#ff3fd2', '#7a3cff']; let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 60; i++) {
    c.globalAlpha = .10 + rnd() * .18; c.fillStyle = cols[i % 3];
    c.beginPath(); c.arc(-MG + rnd() * (W + 2 * MG), -MG + rnd() * (H + 2 * MG), 8 + rnd() * 28, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
  // rumput
  for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#0d4a5c' : '#0b4254'; c.fillRect(i * W / 16, 0, W / 16 + 1, H); }
  g = c.createRadialGradient(W / 2, CY, 120, W / 2, CY, W * .62);
  g.addColorStop(0, 'rgba(34,230,255,.10)'); g.addColorStop(1, 'rgba(5,3,30,.38)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // garis
  c.lineWidth = 3; c.strokeStyle = 'rgba(235,250,255,.9)'; c.shadowColor = '#22e6ff'; c.shadowBlur = S.gfx ? 10 : 0;
  c.strokeRect(0, 0, W, H);
  c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.stroke();
  c.beginPath(); c.arc(W / 2, CY, 110, 0, TAU); c.stroke();
  c.strokeRect(0, CY - 250, 210, 500); c.strokeRect(W - 210, CY - 250, 210, 500);
  c.strokeRect(0, CY - 115, 80, 230); c.strokeRect(W - 80, CY - 115, 80, 230);
  c.fillStyle = '#fff';
  [[W / 2, CY], [150, CY], [W - 150, CY]].forEach(p => { c.beginPath(); c.arc(p[0], p[1], 5, 0, TAU); c.fill(); });
  c.shadowBlur = 0;
  // papan neon
  g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#22e6ff'); g.addColorStop(.5, '#7a3cff'); g.addColorStop(1, '#ff3fd2');
  c.strokeStyle = g; c.lineWidth = 6; c.shadowColor = '#ff3fd2'; c.shadowBlur = S.gfx ? 18 : 0; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-3, CY - GH / 2 - 2); c.lineTo(-3, -3); c.lineTo(W + 3, -3); c.lineTo(W + 3, CY - GH / 2 - 2);
  c.moveTo(-3, CY + GH / 2 + 2); c.lineTo(-3, H + 3); c.lineTo(W + 3, H + 3); c.lineTo(W + 3, CY + GH / 2 + 2);
  c.stroke(); c.shadowBlur = 0;
  // gawang
  for (const side of [0, 1]) {
    const x0 = side ? W : -GD;
    c.fillStyle = 'rgba(8,4,40,.72)'; c.fillRect(x0, CY - GH / 2, GD, GH);
    c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1;
    c.beginPath();
    for (let x = 0; x <= GD; x += 10) { c.moveTo(x0 + x, CY - GH / 2); c.lineTo(x0 + x, CY + GH / 2); }
    for (let y = 0; y <= GH; y += 10) { c.moveTo(x0, CY - GH / 2 + y); c.lineTo(x0 + GD, CY - GH / 2 + y); }
    c.stroke();
    c.strokeStyle = '#22e6ff'; c.lineWidth = 3; c.strokeRect(x0, CY - GH / 2, GD, GH);
    c.fillStyle = '#fff'; c.shadowColor = '#ff3fd2'; c.shadowBlur = S.gfx ? 12 : 0;
    for (const dy of [-1, 1]) { c.beginPath(); c.arc(side ? W : 0, CY + dy * GH / 2, 6, 0, TAU); c.fill(); }
    c.shadowBlur = 0;
  }
  pitch = pc;
  if (pitchTex) { pitchTex.image = pc; pitchTex.needsUpdate = true; }
}
buildPitch();

/* ---------------- State permainan ---------------- */
let G = null;
const cv = $('#cv'), ctx = cv.getContext('2d');
let cssW = 1, cssH = 1, dpr = 1, sc = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, [1, 1.75, 2.5][S.gfx]);
  cssW = cv.clientWidth || 1; cssH = cv.clientHeight || 1;
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
  const vw = cssW < cssH ? 560 : 900;
  sc = Math.min(cssW / vw, cssH / 520);
  if (use3D && R3) { R3.renderer.setPixelRatio(dpr); R3.renderer.setSize(cssW, cssH, false); R3.camera.aspect = cssW / cssH; R3.camera.updateProjectionMatrix(); }
}
window.addEventListener('resize', resize);

function mk(t, role, hx, hy, idx) {
  return {
    team: t, role, hx, hy, idx, x: 0, y: 0, vx: 0, vy: 0, face: t === 0 ? 0 : Math.PI,
    phase: Math.random() * 6, kick: 0, cd: 0, stun: 0, lunge: 0, lcd: 0, tk: 0, hold: 0, think: 0,
    sta: 1, tired: false, spd: 0, gkErr: 0, gkErrT: -9, sm: 1, shs: 3, tks: 3, star: null, charging: false, charge: 0,
    skin: SKINS[(idx * 2 + t) % SKINS.length], hair: HAIR[(idx * 3 + t + 1) % HAIR.length]
  };
}
function applyStar(p, st) {
  p.star = st; p.skin = st.skin; p.hair = st.hair;
  p.sm = 1 + (st.spd - 3) * .035; p.shs = st.sht; p.tks = st.tkl;
}
function makeTeam(t, out, gk, slots, stars) {
  const arr = [];
  if (gk) arr.push(mk(t, 'GK', .035, .5, 0));
  for (let i = 0; i < out; i++) {
    const s = slots[i];
    const p = mk(t, out === 1 ? 'FW' : s[2], s[0], s[1], i + 1);
    if (stars && stars[i]) applyStar(p, stars[i]);
    arr.push(p);
  }
  return arr;
}
function hudNames() {
  const g = G, a = $('#nameA'), b = $('#nameB');
  const st = (el, k, code) => { el.textContent = code; el.style.background = 'linear-gradient(100deg,' + k.c1 + ' 65%,' + k.c2 + ')'; el.style.color = textOn(k.c1); };
  const me = g.me || 0;
  st(a, g.kit[me], g.codes[me]);
  if (g.mode === 'match') { b.style.display = ''; st(b, g.kit[1 - me], g.codes[1 - me]); } else b.style.display = 'none';
}

function startGame(mode, drillKey, opts) {
  opts = opts || {};
  const cfg = mode === 'match' ? MATCH : DRILLS[drillKey];
  const D = DIFF[S.diff];
  const V = opts.versus || null;
  const [kitA, kitB, TA, TB] = pickKits(V ? V.codes[0] : (opts.event ? P[opts.event].me : P.team), V ? V.codes[1] : (opts.opp || P.opp));
  const mine = starObjs();
  const vs = ids => (ids || []).map(id => STAR[id]).filter(Boolean).slice(0, 2);
  let slots0, as0, slots1, as1;
  if (V) {
    slots0 = FORMS[V.forms[0]].slots; as0 = assignStars(slots0, vs(V.stars[0]));
    slots1 = FORMS[V.forms[1]].slots; as1 = assignStars(slots1, vs(V.stars[1]));
  } else if (mode === 'match') {
    slots0 = FORMS[P.form].slots; as0 = assignStars(slots0, mine.slice(0, 2));
    const keys = Object.keys(FORMS); slots1 = FORMS[keys[Math.floor(Math.random() * keys.length)]].slots;
    const os = (TB.pow >= 4 && S.diff >= 1) ? STARS.find(x => x.code === TB.code && x.pos === 'FW') : null;
    as1 = assignStars(slots1, os ? [os] : []);
  } else {
    slots0 = [[.44, .5, 'FW']]; as0 = assignStars(slots0, mine.slice(0, 1));
    slots1 = FORMS['3-1'].slots; as1 = [];
  }
  G = {
    kit: [kitA, kitB], codes: [TA.code, TB.code], trainEarned: 0, event: opts.event || null, opts,
    versus: V, net: V ? (V.mode === 'host' ? 'host' : V.mode === 'local' ? null : 'guest') : null, spec: !!V && V.mode === 'spec', local2p: !!V && V.mode === 'local',
    me: V && V.mode === 'guest' ? 1 : 0, flip: !!V && V.mode === 'guest', remote: newRemote(), endT: 0,
    mode: mode === 'match' ? 'match' : 'train', drillKey, cfg,
    aiMul: V ? 1 : (mode === 'match' ? D.mul * (.94 + TB.pow * .02) : cfg.mul),
    gkSkill: V ? .75 : (mode === 'match' ? D.gk : cfg.gk),
    tkThr: mode === 'match' ? D.tk : .34,
    err: mode === 'match' ? D.err : .12,
    state: 'kickoff', stateT: 1.6, t: 0, timer: V && V.dur ? V.dur : S.dur, paused: false, endShown: false,
    score: [0, 0], teams: [makeTeam(0, cfg.out0, cfg.gk0, slots0, as0), makeTeam(1, cfg.out1, cfg.gk1, slots1, as1)],
    ball: { x: W / 2, y: CY, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, rot: 0 },
    chaser: [null, null], ctrl: null, ctrl1: null, sw: [0, 0], lk: [0, 0],
    parts: [], trail: [], cam: { x: W / 2, y: CY }, shake: 0, hudCache: {}
  };
  G.all = G.teams[0].concat(G.teams[1]); G.in0 = input; G.in1 = (V && V.mode === 'local') ? input2 : G.remote;
  clearInput();
  $('#pauseOv').classList.remove('on'); $('#endOv').classList.remove('on');
  $('#btnReset').hidden = G.mode !== 'train';
  hudNames();
  show('game');
  { const ht = G.local2p || G.spec; $('#btns').style.display = ht ? 'none' : ''; $('#joyZone').style.display = ht ? 'none' : '';
    $('#kbdHint').textContent = G.local2p ? 'P1: WASD · J operan · K tembak · I lambung · O tekel · Shift lari · L ganti   |   P2: panah · , operan · . tembak · / lambung · M tekel · Shift kanan lari · N ganti' : KBD_DEFAULT; }
  if (S.view === 1 && ready3D === null) ready3D = init3D();
  applyView(); resize();
  if (use3D) build3D();
  placeKickoff(0);
  G.cam.x = W / 2; G.cam.y = CY;
  if (G.mode === 'match') { banner('KICKOFF', G.codes[0] + ' vs ' + G.codes[1] + ' · ' + (G.event ? evLabel(G.event) : G.local2p ? 'P1 menyerang ke kanan, P2 ke kiri' : G.spec ? 'mode penonton' : 'kamu menyerang ke kanan'), 1800); SFX.whistle(); }
  else banner(cfg.title.toUpperCase(), 'Cetak gol sebanyak mungkin', 1500);
  last = performance.now();
}

function placeKickoff(kickTeam) {
  const g = G, b = g.ball;
  for (const t of [0, 1]) for (const p of g.teams[t]) {
    const lx = p.role === 'GK' ? .035 : Math.min(p.hx, .43);
    p.x = t === 0 ? lx * W : W - lx * W; p.y = p.hy * H;
    p.vx = p.vy = 0; p.face = t === 0 ? 0 : Math.PI;
    p.cd = p.stun = p.lunge = p.lcd = p.tk = p.hold = 0; p.think = rand(.1, .4); p.spd = 0; p.sta = 1; p.tired = false;
  }
  const team = g.teams[kickTeam].length ? kickTeam : 0;
  const dir = team === 0 ? 1 : -1;
  const kicker = g.teams[team].find(p => p.role === 'FW') || g.teams[team].find(p => p.role !== 'GK') || g.teams[team][0];
  kicker.x = W / 2 - dir * (PR + BR + 2); kicker.y = CY; kicker.face = team === 0 ? 0 : Math.PI;
  b.x = W / 2; b.y = CY; b.z = b.vz = b.vx = b.vy = 0; b.owner = kicker; b.last = kicker;
  g.trail.length = 0;
  for (const t2 of [0, 1]) for (const q of g.teams[t2]) { q.charging = false; q.charge = 0; }
  g.ctrl = team === 0 ? kicker : nearest(g.teams[0].filter(p => p.role !== 'GK'), b);
  if (g.versus) g.ctrl1 = team === 1 ? kicker : nearest(g.teams[1].filter(p => p.role !== 'GK'), b);
  g.state = 'kickoff'; g.stateT = 1.5;
}
function nearest(arr, ref) {
  let best = null, bd = 1e9;
  for (const p of arr) { const d = dist(p, ref); if (d < bd) { bd = d; best = p; } }
  return best;
}
function resetBall() {
  if (!G || G.state !== 'play' && G.state !== 'kickoff') return;
  placeKickoff(0);
  G.state = 'play'; G.stateT = 0;
}

/* ---------------- Kontrol pemain ---------------- */
function move(p, dx, dy, maxSp, h, tfa, acc) {
  if (p.stun > 0) maxSp *= .5;
  maxSp *= p.sm;
  const tvx = dx * maxSp, tvy = dy * maxSp;
  const moving = dx * dx + dy * dy > .0004;
  const k = 1 - Math.exp(-(moving ? (acc || 8.5) : 11) * h);
  p.vx += (tvx - p.vx) * k; p.vy += (tvy - p.vy) * k;
  const s = Math.hypot(p.vx, p.vy);
  let fa = tfa;
  if (fa === undefined && s > 30) fa = Math.atan2(p.vy, p.vx);
  if (fa !== undefined) p.face += angDiff(p.face, fa) * (1 - Math.exp(-13 * h));
  p.x += p.vx * h; p.y += p.vy * h;
  p.x = clamp(p.x, PR, W - PR); p.y = clamp(p.y, PR, H - PR);
  p.spd = s; p.phase += s * h * .052;
}
function seek(p, tx, ty, speed, arrive, h, tfa) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d < 3) { move(p, 0, 0, speed, h, tfa); return; }
  const m = clamp(d / arrive, 0, 1);
  move(p, dx / d * m, dy / d * m, speed, h, tfa);
}

function kick(p, dx, dy, speed, vz) {
  const b = G.ball, l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  b.owner = null; b.last = p;
  b.x = clamp(p.x + dx * (PR + BR + 2), BR, W - BR); b.y = clamp(p.y + dy * (PR + BR + 2), BR, H - BR);
  b.vx = dx * speed + p.vx * .25; b.vy = dy * speed + p.vy * .25; b.vz = vz;
  p.cd = .38; p.kick = 1;
  p.face += angDiff(p.face, Math.atan2(dy, dx)) * .7;
  if (S.gfx) spark(b.x, b.y, S.gfx === 2 ? 8 : 5, p.team === 0 ? '#22e6ff' : '#ff3fd2');
}
function pickPass(p, dx, dy, minAl, fx) {
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  let best = null, bs = -9; const opp = G.teams[1 - p.team];
  for (const q of G.teams[p.team]) {
    if (q === p) continue;
    const vx = q.x - p.x, vy = q.y - p.y, d = Math.hypot(vx, vy);
    if (d < 70 || d > 900) continue;
    const al = (vx * dx + vy * dy) / d; if (al < minAl) continue;
    let s = al * 2.2 - d / 1100 + (fx ? (vx * fx) / 900 : 0);
    for (const o of opp) {
      const t = clamp(((o.x - p.x) * vx + (o.y - p.y) * vy) / (d * d), 0, 1);
      const px = p.x + vx * t - o.x, py = p.y + vy * t - o.y;
      if (px * px + py * py < 2025) s -= 1.4;
    }
    if (q.role === 'GK' && p.role !== 'GK') s -= .9;
    if (s > bs) { bs = s; best = q; }
  }
  return best;
}
function doPass(p, dx, dy, minAl, fx, lob) {
  const q = pickPass(p, dx, dy, minAl, fx);
  if (q) {
    const tx = q.x + q.vx * .35, ty = q.y + q.vy * .35, vx = tx - p.x, vy = ty - p.y, d = Math.hypot(vx, vy);
    if (lob) { const vz = clamp(d * .5, 200, 340), tt = 2 * vz / 900; kick(p, vx, vy, clamp(d / tt, 240, 1000), vz); }
    else kick(p, vx, vy, clamp(d * 1.5 + 100, 260, 880), 0);
  } else if (lob) kick(p, dx, dy, 520, 270);
  else kick(p, dx, dy, 430, 0);
  SFX.pass();
}
function doShoot(p, power, isUser) {
  const gx = p.team === 0 ? W : 0, gk = G.teams[1 - p.team].find(q => q.role === 'GK');
  let ty = CY + rand(-.5, .5) * GH * .7;
  if (gk) ty = CY + (gk.y > CY ? -1 : 1) * GH * rand(.15, .38);
  let dx = gx - p.x, dy = ty - p.y; const dl = Math.hypot(dx, dy) || 1;
  if (isUser) {
    const ux = Math.cos(p.face), uy = Math.sin(p.face), ca = (ux * dx + uy * dy) / dl;
    if (ca > .72) { dx = lerp(ux, dx / dl, .75); dy = lerp(uy, dy / dl, .75); } else { dx = ux; dy = uy; }
  }
  const err = (isUser ? (.05 + .14 * power * .7) : G.err * 2) * (1 - (p.shs - 3) * .1);
  const ang = Math.atan2(dy, dx) + (Math.random() - .5) * err;
  kick(p, Math.cos(ang), Math.sin(ang), (520 + 650 * power) * (1 + (p.shs - 3) * .05), 35 + 150 * power + (power > .85 ? rand(0, 110) : 0));
  SFX.kick();
}
function lunge(p) {
  if (p.lcd > 0 || p.stun > 0) return;
  p.lunge = .3; p.lcd = .95;
  p.vx = Math.cos(p.face) * 350; p.vy = Math.sin(p.face) * 350;
  SFX.tackle();
}

function userControl(p, h, inp) {
  const g = G, b = g.ball;
  let mx = inp.jx + inp.kx, my = inp.jy + inp.ky;
  const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
  const mag = Math.min(1, l);
  const canSprint = inp.sprint && mag > .35 && p.sta > 0 && !p.tired;
  if (canSprint) { p.sta -= .28 * h; if (p.sta <= 0) { p.sta = 0; p.tired = true; } }
  else { p.sta = Math.min(1, p.sta + .16 * h); if (p.tired && p.sta > .3) p.tired = false; }
  const sp = (canSprint ? SPR : RUN) * (b.owner === p ? .94 : 1) * (p.charging ? .85 : 1);
  const tfa = mag > .2 ? Math.atan2(my, mx) : undefined;
  move(p, mx, my, sp, h, tfa);
  const dirx = mag > .2 ? mx : Math.cos(p.face), diry = mag > .2 ? my : Math.sin(p.face);

  if (inp.passEdge) {
    inp.passEdge = false;
    if (b.owner === p) doPass(p, dirx, diry, .35, 0); else lunge(p);
  }
  if (inp.lobEdge) {
    inp.lobEdge = false;
    if (b.owner === p) doPass(p, dirx, diry, .35, 0, true); else lunge(p);
  }
  if (inp.tackleEdge) { inp.tackleEdge = false; if (b.owner !== p) lunge(p); }
  if (inp.shootEdge) {
    inp.shootEdge = false;
    if (b.owner !== p) lunge(p); else { p.charging = true; p.charge = 0; }
  }
  if (p.charging) {
    if (b.owner !== p) { p.charging = false; p.charge = 0; }
    else if (inp.shootHeld) p.charge = Math.min(1, p.charge + h / .85);
    else { doShoot(p, .3 + .7 * p.charge, true); p.charging = false; p.charge = 0; }
  }
}

/* ---------------- AI ---------------- */
function formPos(p, attack) {
  const b = G.ball, t = p.team;
  const lx = t === 0 ? b.x : W - b.x;
  const AT = { FW: 150, MF: 105, DF: 70 }, DF_ = { FW: -10, MF: -30, DF: -50 };
  let ltx = p.hx * W + (lx - W / 2) * .5 + (attack ? AT[p.role] : DF_[p.role]);
  ltx = clamp(ltx, 120, W - 140);
  let ty = p.hy * H + (b.y - CY) * .32;
  if (attack && p.role === 'FW') ty += Math.sin(G.t * .9 + p.idx * 2) * 70;
  return [t === 0 ? ltx : W - ltx, clamp(ty, 50, H - 50)];
}
function ai(p, h) {
  const g = G, b = g.ball, t = p.team, mul = t === 1 ? g.aiMul : 1;
  if (p.role === 'GK') { gkAI(p, h); return; }
  p.think -= h;
  const goalX = t === 0 ? W : 0, dirX = t === 0 ? 1 : -1, owner = b.owner;
  const has = owner && owner.team === t, opp = owner && owner.team !== t;
  if (owner === p) { carrier(p, h, goalX, dirX, mul); return; }
  let tx, ty, speed = RUN * mul, arrive = 40;
  if (g.chaser[t] === p && !has) {
    const ref = opp ? owner : b;
    tx = ref.x + ref.vx * .25 - (opp ? dirX * 10 : 0); ty = ref.y + ref.vy * .25;
    speed = SPR * mul * (Math.hypot(tx - p.x, ty - p.y) > 90 ? 1 : .85); arrive = 14;
  } else {
    [tx, ty] = formPos(p, has);
    if (has) speed = RUN * mul * 1.05;
  }
  seek(p, tx, ty, speed, arrive, h);
}
function carrier(p, h, goalX, dirX, mul) {
  const g = G, t = p.team, opps = g.teams[1 - t];
  p.hold += h;
  const dgx = goalX - p.x, dgy = CY - p.y, dg = Math.hypot(dgx, dgy) || 1;
  let nd = 1e9;
  for (const o of opps) nd = Math.min(nd, dist(o, p));
  if (p.think <= 0) {
    p.think = rand(.18, .34);
    const range = t === 1 ? 360 + S.diff * 50 : 420;
    if (dg < range && Math.abs(p.y - CY) < GH * 1.4 && Math.random() < .55) { doShoot(p, rand(.6, .95), false); p.hold = 0; return; }
    if ((nd < 75 && Math.random() < .6) || p.hold > 3.2) { doPass(p, dirX, 0, -.1, dirX); p.hold = 0; return; }
  }
  let ax = dgx / dg, ay = dgy / dg;
  for (const o of opps) {
    const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy);
    if (d < 130 && d > 1) { const w = (1 - d / 130) * 1.6; ax += dx / d * w; ay += dy / d * w; }
  }
  const l = Math.hypot(ax, ay) || 1;
  move(p, ax / l, ay / l, (RUN + (nd > 110 ? 55 : 0)) * mul * .96, h);
}
function gkAI(p, h) {
  const g = G, b = g.ball, t = p.team, gx = t === 0 ? 0 : W, inw = t === 0 ? 1 : -1;
  const skill = t === 1 ? g.gkSkill : .75;
  const tfa = Math.atan2(b.y - p.y, b.x - p.x);
  if (b.owner === p) {
    p.hold -= h; move(p, 0, 0, 200, h, tfa);
    if (p.hold <= 0) {
      const q = pickPass(p, inw, 0, -.4, inw);
      if (q) doPass(p, q.x - p.x, q.y - p.y, -1, 0); else kick(p, inw, rand(-.5, .5), 620, 40);
      SFX.kick();
    }
    return;
  }
  let tx = gx + inw * 42, ty = CY + clamp((b.y - CY) * .4, -GH * .5, GH * .5), speed = 250 * skill + 60, arrive = 24;
  const incoming = !b.owner && b.vx * inw < -40;
  if (incoming) {
    const tt = (tx - b.x) / b.vx;
    if (tt > 0 && tt < 1.3) {
      if (g.t - p.gkErrT > 1.5) { p.gkErr = rand(-1, 1) * (1 - skill) * 95; p.gkErrT = g.t; }
      const py = b.y + b.vy * tt + p.gkErr;
      if (Math.abs(py - CY) < GH * .85) { ty = py; speed = 420 + 300 * skill; arrive = 8; }
    }
  } else if (!b.owner && dist(b, p) < 210 && Math.abs(b.x - gx) < 300) {
    const rival = nearest(g.teams[1 - t], b);
    if (!rival || dist(rival, b) > dist(p, b) * .9) { tx = b.x; ty = b.y; speed = 300 * skill + 60; arrive = 10; }
  }
  tx = clamp(tx, Math.min(gx, gx + inw * 300), Math.max(gx, gx + inw * 300));
  ty = clamp(ty, CY - GH / 2 - 30, CY + GH / 2 + 30);
  seek(p, tx, ty, speed, arrive, h, tfa);
}

/* ---------------- Simulasi ---------------- */
function teamMeta() {
  const g = G, b = g.ball;
  for (const t of [0, 1]) {
    const ref = (b.owner && b.owner.team !== t) ? b.owner : b;
    let best = null, bd = 1e9;
    for (const p of g.teams[t]) { if (p.role === 'GK') continue; const d = dist(p, ref) + p.stun * 200; if (d < bd) { bd = d; best = p; } }
    g.chaser[t] = best;
  }
}
function autoSwitch(h) {
  const g = G, b = g.ball;
  for (const t of [0, 1]) {
    const key = t ? 'ctrl1' : 'ctrl', inp = t ? g.in1 : g.in0;
    if (t === 1 && !g.versus) continue;
    g.sw[t] -= h; g.lk[t] -= h;
    if (inp.switchEdge) {
      inp.switchEdge = false;
      const cands = g.teams[t].filter(p => p.role !== 'GK' && p !== g[key]);
      if (cands.length) { const old = g[key]; if (old) { old.charging = false; old.charge = 0; } g[key] = nearest(cands, b); g.lk[t] = .9; g.sw[t] = .4; }
    }
    if (g.sw[t] > 0 || g.lk[t] > 0) continue;
    const outs = g.teams[t].filter(p => p.role !== 'GK'); if (!outs.length) continue;
    let target = null;
    if (b.owner && b.owner.team === t) { if (b.owner.role !== 'GK') target = b.owner; }
    else {
      const n = nearest(outs, b), cur = g[key];
      if (!cur || cur.role === 'GK' || dist(n, b) < dist(cur, b) * .78) target = n;
    }
    if (target && target !== g[key]) { const old = g[key]; if (old) { old.charging = false; old.charge = 0; } g[key] = target; g.sw[t] = .3; }
  }
}

function step(h) {
  const g = G, b = g.ball, playing = g.state === 'play';
  teamMeta();
  if (playing) autoSwitch(h);
  for (const t of [0, 1]) for (const p of g.teams[t]) {
    p.cd = Math.max(0, p.cd - h); p.stun = Math.max(0, p.stun - h); p.kick = Math.max(0, p.kick - h * 4);
    p.lunge = Math.max(0, p.lunge - h); p.lcd = Math.max(0, p.lcd - h);
    if (playing) { if (p === g.ctrl) userControl(p, h, g.in0); else if (p === g.ctrl1) userControl(p, h, g.in1); else ai(p, h); }
    else move(p, 0, 0, RUN, h);
  }
  separate();
  ballPhysics(h);
  if (playing) { handleBall(h); checkGoal(); }
}
function separate() {
  const all = G.teams[0].concat(G.teams[1]), m = 2 * PR - 3;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], c = all[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
    if (d < m && d > .001) {
      const push = (m - d) * .5, nx = dx / d, ny = dy / d;
      a.x -= nx * push; a.y -= ny * push; c.x += nx * push; c.y += ny * push;
    }
  }
}
function ballPhysics(h) {
  const g = G, b = g.ball;
  if (b.owner) {
    const o = b.owner, tx = o.x + Math.cos(o.face) * (PR + BR + 1), ty = o.y + Math.sin(o.face) * (PR + BR + 1);
    b.vx += (260 * (tx - b.x) - 32 * (b.vx - o.vx)) * h;
    b.vy += (260 * (ty - b.y) - 32 * (b.vy - o.vy)) * h;
    b.z = 0; b.vz = 0;
    if (dist(b, o) > PR + BR + 28) b.owner = null;
  } else {
    if (b.z <= .5) { const f = Math.exp(-DRAG * h); b.vx *= f; b.vy *= f; }
    else { const f = Math.exp(-.12 * h); b.vx *= f; b.vy *= f; }
    b.vz -= 900 * h; b.z += b.vz * h;
    if (b.z <= 0) { b.z = 0; if (b.vz < -60) b.vz = -b.vz * .42; else b.vz = 0; }
    if (b.z === 0 && Math.abs(b.vx) + Math.abs(b.vy) < 8) { b.vx = b.vy = 0; }
  }
  b.x += b.vx * h; b.y += b.vy * h;
  const sp = Math.hypot(b.vx, b.vy);
  b.rot += sp * h / BR * .9;
  // dinding samping
  if (b.y < BR) { b.y = BR; b.vy = Math.abs(b.vy) * .7; }
  if (b.y > H - BR) { b.y = H - BR; b.vy = -Math.abs(b.vy) * .7; }
  const lim = GH / 2 - BR;
  for (const side of [0, 1]) {
    const sg = side ? -1 : 1; // arah ke dalam lapangan
    const px = side ? W - b.x : b.x; // jarak dari garis gawang (positif = di lapangan)
    if (px < BR) {
      if (Math.abs(b.y - CY) < GH / 2) {
        if (px < 0) {
          if (b.y < CY - lim) { b.y = CY - lim; b.vy = Math.abs(b.vy) * .5; }
          else if (b.y > CY + lim) { b.y = CY + lim; b.vy = -Math.abs(b.vy) * .5; }
          if (px < -GD + BR) { b.x = side ? W + GD - BR : -GD + BR; b.vx = sg * Math.abs(b.vx) * .2; }
        }
      } else { b.x = side ? W - BR : BR; b.vx = sg * Math.abs(b.vx) * .65; }
    }
    // tiang gawang
    if (!b.owner) for (const dy of [-1, 1]) {
      const cx = side ? W : 0, cy = CY + dy * GH / 2, dx2 = b.x - cx, dy2 = b.y - cy, d = Math.hypot(dx2, dy2);
      if (d < BR + 6 && d > .001) {
        const nx = dx2 / d, ny = dy2 / d; b.x = cx + nx * (BR + 6); b.y = cy + ny * (BR + 6);
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny; if (-vn > 150) { SFX.post(); if (S.gfx) spark(b.x, b.y, 6, '#fff'); } }
      }
    }
  }
  if (S.gfx && sp > 380 && !b.owner) { g.trail.push({ x: b.x, y: b.y, z: b.z }); if (g.trail.length > 12) g.trail.shift(); }
  else if (g.trail.length) g.trail.shift();
}
function take(p) {
  const b = G.ball; b.owner = p; b.last = p; p.tk = 0;
  if (p.role === 'GK') p.hold = rand(.8, 1.3);
}
function handleBall(h) {
  const g = G, b = g.ball;
  if (b.owner) {
    const o = b.owner;
    for (const q of g.teams[1 - o.team]) {
      if (o.role === 'GK') { q.tk = 0; continue; }
      const reach = PR + BR + (q.lunge > 0 ? 18 : 9);
      if (dist(q, b) < reach && q.cd <= 0 && q.stun <= 0) {
        q.tk += h * (q.lunge > 0 ? 4 : 1);
        if (q.tk > ((q === g.ctrl || q === g.ctrl1) ? .26 : g.tkThr) * (1 - (q.tks - 3) * .1)) {
          b.owner = q; b.last = q; q.tk = 0; o.cd = .7; o.stun = .3; q.think = .15;
          b.vx += Math.cos(q.face) * 40; b.vy += Math.sin(q.face) * 40;
          SFX.tackle(); if (S.gfx) spark(b.x, b.y, 7, '#fff');
        }
      } else q.tk = 0;
    }
    return;
  }
  const bs = Math.hypot(b.vx, b.vy);
  let best = null, bd = 1e9;
  for (const t of [0, 1]) for (const p of g.teams[t]) {
    p.tk = 0;
    if (p.cd > 0 || p.stun > .2) continue;
    const gk = p.role === 'GK';
    const reach = PR + BR + (gk ? 20 : 7) + (p.lunge > 0 ? 10 : 0), d = dist(p, b);
    if (d < reach && b.z < (gk ? 42 : 22) && d < bd) { bd = d; best = p; }
  }
  if (!best) return;
  if (best.role === 'GK' && bs > 720) {
    const inw = best.team === 0 ? 1 : -1;
    b.vx = inw * Math.abs(b.vx) * .4; b.vy += rand(-220, 220); b.vz = 120; best.cd = .35; best.kick = 1; b.last = best;
    SFX.save(); if (S.gfx) spark(b.x, b.y, 8, '#c8ff3a');
  } else if (bs < 760 || best.lunge > 0) take(best);
  else { b.vx *= .45; b.vy *= .45; best.cd = .25; }
}
function checkGoal() {
  const g = G, b = g.ball;
  for (const side of [0, 1]) {
    const px = side ? b.x - W : -b.x; // positif = melewati garis gawang
    if (px > 2 && Math.abs(b.y - CY) < GH / 2) {
      if (b.z < 50) { scored(side === 0 ? 1 : 0); return; }
      b.x = side ? W - BR : BR; b.vx = (side ? -1 : 1) * Math.abs(b.vx) * .5; b.vz *= .3; SFX.post();
    }
  }
}
function scored(team) {
  const g = G;
  g.state = 'goal'; g.stateT = 2.6; g.shake = 14; g.concede = 1 - team;
  SFX.goal();
  if (g.mode === 'train' && team === 1) { banner('GAWANG SENDIRI', '', 1800); return; }
  g.score[team]++;
  if (g.mode === 'match') banner('GOL!', g.versus ? g.codes[team] + ' mencetak gol' : (team === 0 ? 'Gol untuk kamu' : 'Lawan mencetak gol'), 2200);
  else {
    let extra = '';
    if (g.trainEarned < 60) { g.trainEarned += 5; P.coins += 5; saveP(); renderCoins(); extra = ' · +5 koin'; }
    banner('GOL!', 'Total gol: ' + g.score[0] + extra, 2000);
  }
  confetti(g);
}
function confetti(g) {
  const n = [0, 45, 80][S.gfx], cols = ['#22e6ff', '#ff3fd2', '#ffffff', '#ffe14d', '#7a3cff'];
  const inward = g.ball.x < W / 2 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    g.parts.push({ x: g.ball.x < W / 2 ? 20 : W - 20, y: g.ball.y + rand(-70, 70), z: rand(10, 60), vx: inward * rand(60, 340), vy: rand(-220, 220), vz: rand(260, 620), life: rand(1.2, 2.2), max: 2.2, col: cols[i % 5], sz: rand(3, 6), r: rand(0, TAU), c: true });
  }
}
function endMatch() {
  const g = G; g.state = 'ended'; g.stateT = 1.5; g.all.forEach(q => { q.charging = false; });
  SFX.whistle(); banner('WAKTU HABIS', '', 1600);
}
function spark(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(60, 220);
    G.parts.push({ x, y, z: 8, vz: rand(-30, 90), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.2, .45), max: .45, col, sz: rand(1.5, 3) });
  }
}

/* ---------------- Update utama ---------------- */
function update(dt) {
  const g = G; if (!g || g.paused) return;
  g.t += dt; readKeys();
  // partikel
  for (let i = g.parts.length - 1; i >= 0; i--) {
    const p = g.parts[i]; p.life -= dt; if (p.life <= 0) { g.parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, (p.z || 0) + (p.vz || 0) * dt);
    if (p.c) {
      p.vz = (p.vz || 0) - 520 * dt; p.r += 6 * dt;
      if (p.z <= 0) { p.vz = 0; p.vx *= Math.exp(-6 * dt); p.vy *= Math.exp(-6 * dt); } else { p.vx *= Math.exp(-.6 * dt); p.vy *= Math.exp(-.6 * dt); }
    } else { p.vx *= Math.exp(-4 * dt); p.vy *= Math.exp(-4 * dt); }
  }
  g.shake = Math.max(0, g.shake - dt * 28);
  if (g.net === 'guest') { guestStep(dt); updateCam(dt); updateHud(); return; }
  // alur
  if (g.mode === 'match' && g.timer <= 0 && g.state !== 'ended' && g.state !== 'goal') endMatch();
  if (g.state === 'kickoff') {
    g.stateT -= dt;
    for (const t of [0, 1]) for (const p of g.teams[t]) p.phase += 0;
    if (g.stateT <= 0) { g.state = 'play'; if (g.mode === 'match') SFX.whistle(); }
  } else if (g.state === 'goal') {
    g.stateT -= dt;
    if (g.stateT <= 0) {
      if (g.mode === 'match' && g.timer <= 0) endMatch();
      else placeKickoff(g.mode === 'match' ? g.concede : 0);
    }
  } else if (g.state === 'ended') {
    g.stateT -= dt;
    if (g.stateT <= 0 && !g.endShown) showEnd();
  } else if (g.state === 'play' && g.mode === 'match') {
    g.timer = Math.max(0, g.timer - dt);
  }
  if (g.state !== 'kickoff') {
    const n = Math.ceil(dt / (1 / 100)), h = dt / n;
    for (let i = 0; i < n; i++) step(h);
  } else {
    // saat kickoff: animasi diam, bola menempel ke pemain
    for (const t of [0, 1]) for (const p of g.teams[t]) { p.vx = p.vy = 0; p.spd = 0; }
  }
  updateCam(dt);
  updateHud();
}
function updateCam(dt) {
  const g = G;
  const b = g.ball; let halfW = cssW / (2 * sc), halfH = cssH / (2 * sc);
  if (use3D) { const cp = camParams(); halfW = cp.visW / 2; halfH = cp.visH * .55; }
  let tx = b.x + b.vx * .28, ty = b.y + b.vy * .15;
  const loX = halfW - MG + 10, hiX = W + MG - 10 - halfW, loY = halfH - MG + 10, hiY = H + MG - 10 - halfH;
  tx = loX > hiX ? W / 2 : clamp(tx, loX, hiX); ty = loY > hiY ? CY : clamp(ty, loY, hiY);
  const k = 1 - Math.exp(-5 * dt);
  g.cam.x += (tx - g.cam.x) * k; g.cam.y += (ty - g.cam.y) * k;
}
function updateHud() {
  const g = G, c = g.hudCache, me = g.me || 0, sa = g.score[me], sb = g.score[1 - me];
  if (c.s0 !== sa) { c.s0 = sa; $('#s0').textContent = sa; }
  if (c.s1 !== sb) { c.s1 = sb; $('#s1').textContent = sb; }
  const txt = g.mode === 'match' ? (() => { const s = Math.ceil(g.timer); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); })() : 'Latihan';
  if (c.clock !== txt) { c.clock = txt; $('#clock').textContent = txt; }
}
function banner(t, sub, ms) {
  const el = $('#banner');
  el.innerHTML = '<div class="bt">' + t + '</div>' + (sub ? '<div class="bs">' + sub + '</div>' : '');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(banner.h); banner.h = setTimeout(() => el.classList.remove('show'), ms || 1400);
}

/* ---------------- Render ---------------- */
function drawPlayer(p, isCtrl) {
  const t = p.team, gk = p.role === 'GK';
  const K = G.kit[t];
  const kit = gk ? (t === 0 ? ['#c8ff3a', '#3aa000', '#0b0630'] : ['#ffb02e', '#ff5a1f', '#0b0630']) : [K.c1, shade(K.c1, -.3), K.d];
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(0, 3, 17, 12, 0, 0, TAU); ctx.fill();
  if (isCtrl) {
    const pulse = 1 + Math.sin(G.t * 6) * .06;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.shadowColor = '#22e6ff'; ctx.shadowBlur = S.gfx ? 10 : 0;
    ctx.beginPath(); ctx.ellipse(0, 3, 22 * pulse, 16 * pulse, 0, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.beginPath();
    const ay = -34 + Math.sin(G.t * 6) * 2;
    ctx.moveTo(-6, ay - 6); ctx.lineTo(6, ay - 6); ctx.lineTo(0, ay + 4); ctx.closePath(); ctx.fill();
    // stamina
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(-16, 24, 32, 4);
    ctx.fillStyle = p.tired ? '#ff3fd2' : '#22e6ff'; ctx.fillRect(-16, 24, 32 * p.sta, 4);
    if (p.charging) {
      ctx.lineWidth = 4; ctx.strokeStyle = p.charge > .85 ? '#ff3fd2' : '#ffe14d';
      ctx.beginPath(); ctx.arc(0, 0, 30, -Math.PI / 2, -Math.PI / 2 + TAU * p.charge); ctx.stroke();
    }
  }
  ctx.rotate(p.face);
  const sw = Math.sin(p.phase) * (Math.min(p.spd, 290) / 290) * 9;
  const foot = (x, y) => { ctx.fillStyle = p.star ? '#ffd23c' : '#f4f6ff'; ctx.beginPath(); ctx.ellipse(x, y, 6.5, 3.8, 0, 0, TAU); ctx.fill(); ctx.fillStyle = kit[2]; ctx.fillRect(x - 6, y - .8, 3, 1.6); };
  foot(sw, -5); foot(p.kick > 0 ? 8 + p.kick * 10 : -sw, 5);
  // lengan
  ctx.fillStyle = p.skin;
  ctx.beginPath(); ctx.arc(-sw * .5, -14, 3.8, 0, TAU); ctx.arc(sw * .5, 14, 3.8, 0, TAU); ctx.fill();
  // badan
  const g = ctx.createLinearGradient(-9, -14, 9, 14); g.addColorStop(0, kit[0]); g.addColorStop(1, kit[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 9, 13.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = kit[2]; ctx.globalAlpha = .9;
  ctx.beginPath(); ctx.arc(-2, -6, 2.6, 0, TAU); ctx.arc(3, 3, 2.2, 0, TAU); ctx.arc(-3, 7, 2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  // kepala
  ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(1.5, 0, 7.2, 0, TAU); ctx.fill();
  ctx.fillStyle = p.hair; ctx.beginPath(); ctx.arc(1.5, 0, 7.5, Math.PI * .5, Math.PI * 1.5); ctx.fill();
  ctx.restore();
}
function drawBall() {
  const b = G.ball, zs = Math.min(b.z, 90), sp = Math.hypot(b.vx, b.vy);
  ctx.fillStyle = 'rgba(0,0,0,' + (.38 - zs * .003) + ')';
  ctx.beginPath(); ctx.ellipse(b.x, b.y + 2, BR * (1.1 - zs * .004), BR * .8 * (1 - zs * .004), 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(b.x, b.y - b.z * .7); ctx.rotate(b.rot);
  if (S.gfx && sp > 450) { ctx.shadowColor = '#22e6ff'; ctx.shadowBlur = 12; }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, BR, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#1b1240';
  ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.fill();
  for (let i = 0; i < 5; i++) { const a = i * TAU / 5; ctx.beginPath(); ctx.arc(Math.cos(a) * 5.6, Math.sin(a) * 5.6, 1.8, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function render(dt) { if (!G) return; if (use3D && R3) render3D(dt); else render2D(); }
function render2D() {
  const g = G; if (!g) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#070420'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (g.flip) ctx.setTransform(-dpr * sc, 0, 0, -dpr * sc, cv.width, cv.height); else ctx.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
  const sx = g.shake ? rand(-1, 1) * g.shake * .5 : 0, sy = g.shake ? rand(-1, 1) * g.shake * .5 : 0;
  ctx.translate(cssW / (2 * sc) - g.cam.x + sx, cssH / (2 * sc) - g.cam.y + sy);
  ctx.drawImage(pitch, -MG, -MG, W + 2 * MG, H + 2 * MG);
  // jejak bola
  if (g.trail.length > 1) {
    ctx.lineCap = 'round';
    for (let i = 1; i < g.trail.length; i++) {
      ctx.strokeStyle = 'rgba(34,230,255,' + (i / g.trail.length * .35) + ')'; ctx.lineWidth = BR * 1.4 * (i / g.trail.length);
      ctx.beginPath(); ctx.moveTo(g.trail[i - 1].x, g.trail[i - 1].y - g.trail[i - 1].z * .7); ctx.lineTo(g.trail[i].x, g.trail[i].y - g.trail[i].z * .7); ctx.stroke();
    }
  }
  const ents = g.teams[0].concat(g.teams[1]).map(p => ({ y: p.y, p })); ents.push({ y: g.ball.y - 1, ball: true });
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) e.ball ? drawBall() : drawPlayer(e.p, e.p === g.ctrl || e.p === g.ctrl1);
  ctx.font = '600 12px Saira, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.fillStyle = '#ffd23c';
  for (const t of [0, 1]) for (const p of g.teams[t]) if (p.star && !g.flip) { ctx.strokeText(p.star.name, p.x, p.y - 30); ctx.fillText(p.star.name, p.x, p.y - 30); }
  for (const p of g.parts) {
    ctx.globalAlpha = clamp(p.life / (p.max * .6), 0, 1); ctx.fillStyle = p.col;
    if (p.c) { ctx.save(); ctx.translate(p.x, p.y - (p.z || 0) * .7); ctx.rotate(p.r); ctx.fillRect(-p.sz, -p.sz / 2, p.sz * 2, p.sz); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(p.x, p.y - (p.z || 0) * .7, p.sz, 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}


/* ---------------- Renderer 3D (Three.js) ---------------- */
let ready3D = null, use3D = false, R3 = null;
const cv3 = $('#cv3');
function applyView() { use3D = S.view === 1 && ready3D === true; cv3.style.display = use3D ? 'block' : 'none'; }
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  return new THREE.CanvasTexture(c);
}
function init3D() {
  if (typeof THREE === 'undefined') return false;
  try {
    const renderer = new THREE.WebGLRenderer({ canvas: cv3, antialias: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x070420, 1);
    const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x070420, 1000, 2800);
    const camera = new THREE.PerspectiveCamera(42, 1, 10, 6000);
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x3a1a80, 1.0));
    const sun = new THREE.DirectionalLight(0xffffff, .7); sun.position.set(400, 900, 300); scene.add(sun);
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); scene.add(m); return m; };

    // tanah + lapangan
    const ground = add(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshBasicMaterial({ color: 0x0a0533 }), W / 2, -1, H / 2);
    ground.rotation.x = -Math.PI / 2;
    pitchTex = new THREE.CanvasTexture(pitch);
    pitchTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const pl = add(new THREE.PlaneGeometry(W + 2 * MG, H + 2 * MG), new THREE.MeshBasicMaterial({ map: pitchTex }), W / 2, 0, H / 2);
    pl.rotation.x = -Math.PI / 2;

    // papan neon
    const gradTex = canvasTex(256, 4, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#22e6ff'); g.addColorStop(.5, '#7a3cff'); g.addColorStop(1, '#ff3fd2'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
    const bm = new THREE.MeshBasicMaterial({ map: gradTex }), pm = new THREE.MeshBasicMaterial({ color: 0xff3fd2 }), wm = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const bw = W + 2 * GD + 16;
    add(new THREE.BoxGeometry(bw, 16, 8), bm, W / 2, 8, -4);
    add(new THREE.BoxGeometry(bw, 2, 4), wm, W / 2, 16.5, -4);
    add(new THREE.BoxGeometry(bw, 6, 8), bm, W / 2, 3, H + 4);
    const endLen = CY - GH / 2;
    for (const sx of [-4, W + 4]) {
      add(new THREE.BoxGeometry(8, 16, endLen), pm, sx, 8, endLen / 2);
      add(new THREE.BoxGeometry(8, 16, endLen), pm, sx, 8, H - endLen / 2);
    }

    // gawang
    const postM = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x666666 });
    const netTex = canvasTex(64, 64, (x, w, h) => { x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 3; x.strokeRect(0, 0, w, h); });
    netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
    const netPlane = (w, h, px, py, pz, rx, ry) => {
      const t = netTex.clone(); t.needsUpdate = true; t.repeat.set(w / 12, h / 12);
      const m = add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }), px, py, pz);
      m.rotation.set(rx, ry, 0);
    };
    for (const side of [0, 1]) {
      const x0 = side ? W : 0, dir = side ? 1 : -1;
      for (const dz of [-1, 1]) add(new THREE.CylinderGeometry(5, 5, 50, 10), postM, x0, 25, CY + dz * GH / 2);
      add(new THREE.CylinderGeometry(5, 5, GH, 10), postM, x0, 50, CY).rotation.x = Math.PI / 2;
      netPlane(GH, 50, x0 + dir * GD, 25, CY, 0, Math.PI / 2);
      for (const dz of [-1, 1]) netPlane(GD, 50, x0 + dir * GD / 2, 25, CY + dz * GH / 2, 0, 0);
      netPlane(GD, GH, x0 + dir * GD / 2, 50, CY, -Math.PI / 2, 0);
    }

    // dekorasi stadion: bokeh neon dan tiang lampu
    const bcols = [0x22e6ff, 0xff3fd2, 0x7a3cff];
    for (let i = 0; i < 36; i++) {
      add(new THREE.SphereGeometry(8 + Math.random() * 28, 10, 8), new THREE.MeshBasicMaterial({ color: bcols[i % 3], transparent: true, opacity: .25 + Math.random() * .25 }),
        -500 + Math.random() * (W + 1000), 60 + Math.random() * 300, -140 - Math.random() * 640);
    }
    for (const px of [-150, W + 150]) {
      add(new THREE.CylinderGeometry(4, 7, 340, 8), new THREE.MeshLambertMaterial({ color: 0x2a1a70 }), px, 170, -150);
      add(new THREE.BoxGeometry(80, 18, 30), new THREE.MeshBasicMaterial({ color: 0xffffff }), px, 345, -150);
    }

    // bola
    const ballTex = canvasTex(128, 64, (x, w, h) => {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#1b1240';
      [[16, 14], [48, 30], [80, 12], [112, 30], [32, 52], [64, 54], [96, 52], [0, 34], [126, 50]].forEach(q => { x.beginPath(); x.arc(q[0], q[1], 8, 0, TAU); x.fill(); });
    });
    const ball = add(new THREE.SphereGeometry(BR, 18, 14), new THREE.MeshLambertMaterial({ map: ballTex, emissive: 0x444444 }), W / 2, BR, CY);

    // bayangan lembut
    const shTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
    const shMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false });
    const shGeo = new THREE.PlaneGeometry(1, 1); shGeo.rotateX(-Math.PI / 2);
    const bshadow = new THREE.Mesh(shGeo, shMat.clone()); scene.add(bshadow);

    // penanda pemain yang dikontrol
    const ringGeo = new THREE.RingGeometry(19, 23, 40); ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x22e6ff, transparent: true, opacity: .95, side: THREE.DoubleSide })); scene.add(ring);
    const arrowGeo = new THREE.ConeGeometry(6, 13, 4); arrowGeo.rotateX(Math.PI);
    const arrow = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xffffff })); scene.add(arrow);

    const ring2 = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff3fd2, transparent: true, opacity: .95, side: THREE.DoubleSide })); scene.add(ring2);
    const arrow2 = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xff3fd2 })); scene.add(arrow2);
    R3 = { renderer, scene, camera, ball, bshadow, ring, arrow, ring2, arrow2, shGeo, shMat, players: [], v: new THREE.Vector3(), axis: new THREE.Vector3(), q: new THREE.Quaternion() };
    return true;
  } catch (e) { console.warn('3D tidak tersedia, memakai mode 2D', e); return false; }
}
function mkModel(p) {
  const t = p.team, gk = p.role === 'GK';
  const K = G.kit[t];
  const kit = gk ? (t === 0 ? ['#c8ff3a', '#3aa000', '#0b0630'] : ['#ffb02e', '#ff5a1f', '#0b0630']) : [K.c1, K.c2, K.d];
  const mat = (c, em) => new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(c).multiplyScalar(em || 0) });
  const shirt = mat(kit[0], .3), shorts = mat(kit[1], .25), accent = mat(kit[2], .6), skin = mat(p.skin, .2), hair = mat(p.hair, .1),
        shoe = mat(p.star ? '#ffd23c' : '#f4f6ff', .4), dark = mat('#1b1240', 0);
  const root = new THREE.Group(), yaw = new THREE.Group(), body = new THREE.Group();
  root.add(yaw); yaw.add(body); root.scale.setScalar(1.15);
  const put = (geo, m, x, y, z, parent) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); (parent || body).add(o); return o; };
  put(new THREE.CylinderGeometry(7, 8, 16, 10), shirt, 0, 23, 0).scale.z = 1.35;
  put(new THREE.CylinderGeometry(8.4, 8.4, 3, 10), accent, 0, 25, 0).scale.z = 1.35;
  put(new THREE.CylinderGeometry(8, 7.5, 7, 10), shorts, 0, 13.5, 0).scale.z = 1.3;
  const leg = z => {
    const g = new THREE.Group(); g.position.set(0, 11, z); body.add(g);
    put(new THREE.CylinderGeometry(2.8, 2.4, 11, 8), skin, 0, -5.5, 0, g);
    put(new THREE.CylinderGeometry(3, 3, 5, 8), shirt, 0, -8, 0, g);
    put(new THREE.BoxGeometry(8, 3, 5), shoe, 2, -9.8, 0, g);
    return g;
  };
  const arm = z => {
    const g = new THREE.Group(); g.position.set(0, 29, z); body.add(g);
    put(new THREE.CylinderGeometry(2.7, 2.5, 5, 8), shirt, 0, -2.5, 0, g);
    put(new THREE.CylinderGeometry(2.2, 2, 7, 8), skin, 0, -8, 0, g);
    put(new THREE.SphereGeometry(gk ? 3.4 : 2.5, 8, 6), gk ? accent : skin, 0, -12, 0, g);
    return g;
  };
  const legL = leg(-4.6), legR = leg(4.6), armL = arm(-10.8), armR = arm(10.8);
  put(new THREE.SphereGeometry(6.3, 14, 10), skin, .8, 37, 0);
  put(new THREE.SphereGeometry(6.8, 14, 8, 0, TAU, 0, Math.PI * .6), hair, -.4, 37.4, 0);
  put(new THREE.BoxGeometry(1.6, 2.2, 6.4), dark, 6, 37.6, 0);
  const shadow = new THREE.Mesh(R3.shGeo, R3.shMat); shadow.scale.set(40, 1, 40);
  return { root, yaw, body, legL, legR, armL, armR, shadow };
}
function build3D() {
  const R = R3;
  R.players.forEach(o => { R.scene.remove(o.root); R.scene.remove(o.shadow); }); R.players = [];
  for (const t of [0, 1]) for (const p of G.teams[t]) { const m = mkModel(p); R.scene.add(m.root); R.scene.add(m.shadow); p.m3 = m; R.players.push(m); }
}
function camParams() {
  const a = cssW / cssH, tanH = Math.tan(21 * Math.PI / 180);
  const needH = Math.max((cssW < cssH ? 600 : 820) / a, 440);
  const dist = needH / (2 * tanH), el = 52 * Math.PI / 180;
  return { dist, tanH, h: dist * Math.sin(el), back: dist * Math.cos(el), visW: needH * a, visH: needH };
}
function proj(x, y, z) { const v = R3.v; v.set(x, y, z).project(R3.camera); return [(v.x * .5 + .5) * cssW, (-v.y * .5 + .5) * cssH]; }
function render3D(dt) {
  const g = G, R = R3, b = g.ball, cp = camParams();
  dt = dt || .016;
  const shx = g.shake ? rand(-1, 1) * g.shake * .6 : 0, shy = g.shake ? rand(-1, 1) * g.shake * .4 : 0;
  R.camera.position.set(g.cam.x + shx, cp.h + shy, g.cam.y + (g.flip ? -cp.back : cp.back));
  R.camera.lookAt(g.cam.x, 0, g.cam.y);
  for (const t of [0, 1]) for (const p of g.teams[t]) {
    const m = p.m3; if (!m) continue;
    m.root.position.set(p.x, 0, p.y);
    m.yaw.rotation.y = -p.face;
    const k = Math.min(p.spd, 290) / 290, sw = Math.sin(p.phase) * k * .95;
    m.legL.rotation.z = sw;
    m.legR.rotation.z = p.kick > 0 ? .3 + p.kick * 1.2 : -sw;
    m.armL.rotation.z = -sw * .85; m.armR.rotation.z = sw * .85;
    let lean = -.2 * k, by = Math.abs(Math.sin(p.phase)) * 1.6 * k + Math.sin(g.t * 2 + p.idx) * .25;
    if (p.lunge > 0) { lean = -1.05; by = 0; }
    m.body.rotation.z += (lean - m.body.rotation.z) * Math.min(1, dt * 14);
    m.body.position.y = by;
    m.shadow.position.set(p.x + 3, .4, p.y + 3);
  }
  R.ball.position.set(b.x, BR + b.z, b.y);
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > 1) { R.axis.set(b.vy, 0, -b.vx).normalize(); R.q.setFromAxisAngle(R.axis, sp * dt / BR); R.ball.quaternion.premultiply(R.q); }
  const zs = clamp(1 - b.z * .006, .3, 1);
  R.bshadow.position.set(b.x + 2, .5, b.y + 2); R.bshadow.scale.set(22 * zs, 1, 22 * zs); R.bshadow.material.opacity = zs;
  const c = g.ctrl, c1 = g.ctrl1, pu = 1 + Math.sin(g.t * 6) * .07;
  R.ring.visible = R.arrow.visible = !!c; R.ring2.visible = R.arrow2.visible = !!c1;
  if (c) { R.ring.position.set(c.x, .7, c.y); R.ring.scale.set(pu, pu, pu); R.arrow.position.set(c.x, 80 + Math.sin(g.t * 6) * 3, c.y); R.arrow.rotation.y += dt * 2.5; }
  if (c1) { R.ring2.position.set(c1.x, .7, c1.y); R.ring2.scale.set(pu, pu, pu); R.arrow2.position.set(c1.x, 80 + Math.sin(g.t * 6) * 3, c1.y); R.arrow2.rotation.y += dt * 2.5; }
  R.renderer.render(R.scene, R.camera);
  overlay3D(cp);
}
function overlay3D(cp) {
  const g = G, pxu = cssH / (2 * cp.dist * cp.tanH);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssW, cssH);
  if (g.trail.length > 1) {
    ctx.lineCap = 'round';
    for (let i = 1; i < g.trail.length; i++) {
      const a = proj(g.trail[i - 1].x, BR + g.trail[i - 1].z, g.trail[i - 1].y), c = proj(g.trail[i].x, BR + g.trail[i].z, g.trail[i].y);
      ctx.strokeStyle = 'rgba(34,230,255,' + (i / g.trail.length * .4) + ')'; ctx.lineWidth = Math.max(1, BR * 1.4 * pxu * i / g.trail.length);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    }
  }
  for (const p of g.parts) {
    const s = proj(p.x, p.z || 0, p.y), sz = Math.max(1.5, p.sz * pxu * 1.3);
    ctx.globalAlpha = clamp(p.life / (p.max * .6), 0, 1); ctx.fillStyle = p.col;
    if (p.c) { ctx.save(); ctx.translate(s[0], s[1]); ctx.rotate(p.r); ctx.fillRect(-sz, -sz / 2, sz * 2, sz); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(s[0], s[1], sz * .8, 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.font = '600 12px Saira, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.fillStyle = '#ffd23c';
  for (const t of [0, 1]) for (const q of g.teams[t]) if (q.star) { const n = proj(q.x, 72, q.y); ctx.strokeText(q.star.name, n[0], n[1]); ctx.fillText(q.star.name, n[0], n[1]); }
  const c = g.me === 1 ? g.ctrl1 : g.ctrl;
  if (c) {
    const f = proj(c.x, 0, c.y + 18), w = 34 * pxu / .9 * .9;
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(f[0] - w / 2, f[1], w, 4);
    ctx.fillStyle = c.tired ? '#ff3fd2' : '#22e6ff'; ctx.fillRect(f[0] - w / 2, f[1], w * c.sta, 4);
    if (c.charging) {
      const hd = proj(c.x, 100, c.y), bw = 56;
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(hd[0] - bw / 2 - 2, hd[1] - 2, bw + 4, 10);
      ctx.fillStyle = c.charge > .85 ? '#ff3fd2' : '#ffe14d'; ctx.fillRect(hd[0] - bw / 2, hd[1], bw * c.charge, 6);
    }
  }
}


/* ---------------- Main bareng teman: online (room) & satu perangkat ---------------- */
const KBD_DEFAULT = $('#kbdHint').textContent;
const NET = { nr: null, code: '', role: '', n: 0, gid: 0, lastGid: 0, lastN: -1, acc: 0, snap: null, snapAt: 0, cnt: { cp: 0, cl: 0, ct: 0, cs: 0, cw: 0 }, ready: 0, unsubs: [], lostT: 0, pzT: 0 };
const ROOM_CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 4 }, () => ROOM_CH[Math.floor(Math.random() * ROOM_CH.length)]).join('');
const olNote = t => { $('#olNote').textContent = t || ''; if (t) { try { toast(t); } catch (e) {} } };
async function netLeave() {
  NET.unsubs.forEach(f => { try { f(); } catch (e) {} }); NET.unsubs = [];
  const nr = NET.nr; NET.nr = null; NET.role = '';
  if (nr) { try { await nr.leave(); } catch (e) {} }
}
/* Mabar tanpa server sendiri: PeerJS (peer-to-peer) meniru API room dengan kode 4 huruf */
const PeerRoom = {
  async join(role, code) {
    if (!window.Peer) throw { code: 'peerjs-tidak-dimuat' };
    const hostId = 'futsalgame-' + code.toLowerCase(), isHost = role === 'host';
    const meId = isHost ? 'H' : 'G', otherId = isHost ? 'G' : 'H';
    const peer = new Peer(isHost ? hostId : undefined, { debug: 0 });
    const st = { mine: {}, theirs: {}, conn: null, subs: new Set(), errs: new Set(), closed: false };
    const list = () => { const a = [{ peer: meId, isMe: true, sameTab: true, presence: st.mine }]; if (st.conn && st.conn.open) a.push({ peer: otherId, isMe: false, sameTab: false, presence: st.theirs }); return a; };
    const emit = () => st.subs.forEach(f => { try { f({ peers: list(), joined: [], left: [] }); } catch (e) {} });
    const fail = e => { if (!st.closed) st.errs.forEach(f => { try { f(e); } catch (x) {} }); };
    const merge = (o, p) => { for (const k in p) { if (p[k] === null) delete o[k]; else o[k] = p[k]; } };
    const bind = c => {
      st.conn = c;
      c.on('open', () => { try { c.send({ p: st.mine }); } catch (e) {} emit(); });
      c.on('data', d => { if (d && d.p) { merge(st.theirs, d.p); emit(); } });
      c.on('close', () => { if (st.conn === c) { st.conn = null; st.theirs = {}; emit(); } });
      c.on('error', e => fail({ code: e && e.type || 'conn' }));
    };
    await new Promise((res, rej) => {
      const to = setTimeout(() => rej({ code: 'timeout' }), 12000);
      peer.on('error', e => { clearTimeout(to); rej({ code: e && e.type || 'peer' }); });
      peer.on('open', () => {
        if (isHost) { clearTimeout(to); res(); return; }
        const c = peer.connect(hostId, { reliable: true, serialization: 'json' });
        c.on('open', () => { clearTimeout(to); res(); });
        bind(c);
      });
    });
    peer.removeAllListeners('error');
    peer.on('error', e => fail({ code: e && e.type || 'peer' }));
    peer.on('disconnected', () => { if (!st.closed) { try { peer.reconnect(); } catch (e) {} } });
    if (isHost) peer.on('connection', c => { if (st.conn && st.conn.open) { c.close(); return; } bind(c); });
    return {
      presence: patch => { merge(st.mine, patch); if (st.conn && st.conn.open) { try { st.conn.send({ p: patch }); } catch (e) {} } return Promise.resolve(); },
      peers: () => list(),
      onPeers: (h, err) => { st.subs.add(h); if (err) st.errs.add(err); return () => { st.subs.delete(h); if (err) st.errs.delete(err); }; },
      leave: async () => { st.closed = true; try { st.conn && st.conn.close(); } catch (e) {} try { peer.destroy(); } catch (e) {} }
    };
  }
};
async function netJoin(role, code) {
  olNote('Menghubungkan…');
  try {
    const cl = window.claude, room = cl && cl.use ? await cl.use('room') : null;
    let nr;
    if (room) { await netLeave(); nr = await room.join('ns-' + code.toLowerCase()); }
    else if (window.Peer) { await netLeave(); nr = await PeerRoom.join(role, code); }
    else { olNote('Mode online tidak tersedia (perlu internet). Kamu tetap bisa bermain berdua di satu perangkat.'); return false; }
    Object.assign(NET, { nr, code, role, ready: 0, gid: 0, lastGid: 0, lastN: -1, snap: null, n: 0, lostT: 0 });
    NET.unsubs = [nr.onPeers(onPeers, e => netFail(e))];
    netHello(); olNote('');
    return true;
  } catch (e) {
    const k = e && e.code;
    olNote(k === 'peer-unavailable' ? 'Ruangan dengan kode itu tidak ditemukan. Pastikan kode benar dan temanmu sudah membuat ruangan.' : k === 'unavailable-id' ? 'Kode sedang dipakai. Buat ruangan lagi.' : k === 'timeout' ? 'Koneksi terlalu lama. Cek internet lalu coba lagi.' : 'Gagal masuk ruangan (' + (k || 'error') + '). Coba lagi.');
    try { await netLeave(); } catch (x) {} return false;
  }
}
function netFail(e) { olNote('Koneksi ruangan terputus (' + (e && e.code) + ').'); if (G && G.net) netLost('Koneksi terputus.'); }
function netHello() { if (NET.nr) NET.nr.presence({ role: NET.role, tm: P.team, fm: P.form, st: P.squad.slice(0, 2), rd: NET.ready }).catch(() => {}); }
function netLost(msg) {
  const g = G; if (!g || g.endShown) return;
  g.state = 'ended'; g.endShown = true; g.paused = false; $('#pauseOv').classList.remove('on');
  const me = g.me || 0;
  $('#eAgain').textContent = 'Kembali ke ruangan';
  $('#endTitle').textContent = 'Koneksi terputus'; $('#endScore').textContent = g.score[me] + ' - ' + g.score[1 - me]; $('#endMeta').textContent = msg;
  $('#endOv').classList.add('on');
}
function startFromCfg(cfg, peers) {
  const me = peers.find(p => p.isMe && p.sameTab), isGuest = !!me && cfg.guest === me.peer;
  if (!cfg.codes || !TEAM[cfg.codes[0]] || !TEAM[cfg.codes[1]] || !FORMS[cfg.forms[0]] || !FORMS[cfg.forms[1]]) return;
  NET.lastGid = cfg.gid; NET.lastN = -1; NET.snap = null; NET.snapAt = performance.now(); NET.lostT = 0;
  startGame('match', null, { versus: Object.assign({}, cfg, { mode: isGuest ? 'guest' : 'spec' }) });
}
function hostStart() {
  if (!NET.nr || NET.role !== 'host') return;
  const peers = NET.nr.peers(), gp = peers.find(p => !p.isMe && p.presence.role === 'guest');
  if (!gp || !gp.presence.rd) return;
  const gt = TEAM[gp.presence.tm] ? gp.presence.tm : 'BRA', gf = FORMS[gp.presence.fm] ? gp.presence.fm : '2-2';
  const gs = (Array.isArray(gp.presence.st) ? gp.presence.st : []).filter(id => STAR[id]).slice(0, 2);
  const cfg = { gid: ++NET.gid, codes: [P.team, gt], forms: [P.form, gf], stars: [P.squad.slice(0, 2), gs], dur: S.dur, guest: gp.peer };
  NET.lastGid = cfg.gid; NET.n = 0; NET.lostT = 0;
  NET.nr.presence({ cfg }).catch(() => {});
  startGame('match', null, { versus: Object.assign({}, cfg, { mode: 'host' }) });
}
function applyRemote(i) {
  const r = G && G.remote; if (!r || !i) return;
  r.jx = +i.x || 0; r.jy = +i.y || 0; r.sprint = !!i.sp; r.shootHeld = !!i.sh;
  const edge = (key, flag) => { if (r['_' + key] !== undefined && i[key] !== r['_' + key]) r[flag] = true; r['_' + key] = i[key]; };
  edge('cp', 'passEdge'); edge('cl', 'lobEdge'); edge('ct', 'tackleEdge'); edge('cs', 'shootEdge'); edge('cw', 'switchEdge');
}
function onPeers(ch) {
  const peers = ch.peers, host = peers.find(p => !p.isMe && p.presence.role === 'host'), g = G;
  if (g && g.net === 'host') { const gp = peers.find(p => p.peer === g.versus.guest); if (gp) applyRemote(gp.presence.i); return; }
  if (g && g.net === 'guest') {
    const hs = host && host.presence.s;
    if (hs && hs.n !== NET.lastN) { NET.snap = hs; NET.lastN = hs.n; NET.snapAt = performance.now(); NET.lostT = 0; }
    if (host && host.presence.cfg && host.presence.cfg.gid > NET.lastGid && g.state === 'ended') startFromCfg(host.presence.cfg, peers);
    return;
  }
  if (!g && NET.role === 'guest' && host && host.presence.cfg && host.presence.cfg.gid > NET.lastGid) startFromCfg(host.presence.cfg, peers);
  if (!g && $('#online').classList.contains('active')) renderRoomStatus();
}
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
function buildSnap(g) {
  const all = g.all, b = g.ball, ix = p => p ? all.indexOf(p) : -1;
  return {
    n: ++NET.n, st: ['kickoff', 'play', 'goal', 'ended'].indexOf(g.state), tm: r1(g.timer), sc: g.score.slice(), pz: g.paused ? 1 : 0,
    b: [r1(b.x), r1(b.y), r1(b.z), Math.round(b.vx), Math.round(b.vy), Math.round(b.vz), ix(b.owner)],
    p: all.map(p => [r1(p.x), r1(p.y), Math.round(p.vx), Math.round(p.vy), r2(p.face), (p.kick > .3 ? 1 : 0) | (p.lunge > 0 ? 2 : 0) | (p.charging ? 4 : 0) | (p.stun > 0 ? 8 : 0)]),
    c: [ix(g.ctrl), ix(g.ctrl1)],
    ch: [g.ctrl ? r2(g.ctrl.charge) : 0, g.ctrl1 ? r2(g.ctrl1.charge) : 0],
    sa: [g.ctrl ? r2(g.ctrl.sta) : 1, g.ctrl1 ? r2(g.ctrl1.sta) : 1]
  };
}
function netTick(dt) {
  const g = G; if (!g || !g.net || !NET.nr) return;
  NET.acc += dt; if (NET.acc < .05) return; NET.acc = 0;
  if (g.net === 'host') {
    NET.nr.presence({ s: buildSnap(g) }).catch(() => {});
    if (NET.nr.peers().some(p => p.peer === g.versus.guest)) NET.lostT = 0;
    else { NET.lostT += .05; if (NET.lostT > 5 && g.state !== 'ended') netLost('Temanmu terputus dari ruangan.'); }
  } else {
    if (!g.spec) {
      const c = NET.cnt;
      if (input.passEdge) { c.cp++; input.passEdge = false; }
      if (input.lobEdge) { c.cl++; input.lobEdge = false; }
      if (input.tackleEdge) { c.ct++; input.tackleEdge = false; }
      if (input.shootEdge) { c.cs++; input.shootEdge = false; }
      if (input.switchEdge) { c.cw++; input.switchEdge = false; }
      let mx = input.jx + input.kx, my = input.jy + input.ky; const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
      if (g.paused) mx = my = 0;
      NET.nr.presence({ i: { x: r2(-mx), y: r2(-my), sp: input.sprint && !g.paused ? 1 : 0, sh: input.shootHeld ? 1 : 0, cp: c.cp, cl: c.cl, ct: c.ct, cs: c.cs, cw: c.cw } }).catch(() => {});
    }
    if (g.state !== 'ended' && performance.now() - NET.snapAt > 6000) netLost('Tuan rumah terputus.');
  }
}
function guestStep(dt) {
  const g = G, s = NET.snap; if (!s) return;
  const age = Math.min(.25, (performance.now() - NET.snapAt) / 1000), k = 1 - Math.exp(-16 * dt), kf = 1 - Math.exp(-14 * dt), all = g.all, b = g.ball;
  for (let i = 0; i < all.length; i++) {
    const p = all[i], q = s.p[i]; if (!q) continue;
    const tx = q[0] + q[2] * age, ty = q[1] + q[3] * age;
    if (Math.hypot(tx - p.x, ty - p.y) > 160) { p.x = tx; p.y = ty; } else { p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; }
    p.vx = q[2]; p.vy = q[3]; p.spd = Math.hypot(q[2], q[3]);
    p.face += angDiff(p.face, q[4]) * kf; p.phase += p.spd * dt * .052;
    const fl = q[5];
    if ((fl & 1) && !p._k) { p.kick = 1; if (g.state === 'play') SFX.kick(); }
    p._k = fl & 1; p.kick = Math.max(0, p.kick - dt * 4);
    p.lunge = (fl & 2) ? .2 : 0; p.charging = !!(fl & 4); p.stun = (fl & 8) ? .2 : 0;
  }
  const bq = s.b, btx = bq[0] + bq[3] * age, bty = bq[1] + bq[4] * age;
  if (Math.hypot(btx - b.x, bty - b.y) > 200) { b.x = btx; b.y = bty; } else { b.x += (btx - b.x) * k; b.y += (bty - b.y) * k; }
  b.z += (bq[2] - b.z) * k; b.vx = bq[3]; b.vy = bq[4]; b.vz = bq[5]; b.owner = bq[6] >= 0 ? all[bq[6]] : null;
  b.rot += Math.hypot(b.vx, b.vy) * dt / BR * .9;
  if (S.gfx && Math.hypot(b.vx, b.vy) > 380 && !b.owner) { g.trail.push({ x: b.x, y: b.y, z: b.z }); if (g.trail.length > 12) g.trail.shift(); } else if (g.trail.length) g.trail.shift();
  g.ctrl = s.c[0] >= 0 ? all[s.c[0]] : null; g.ctrl1 = s.c[1] >= 0 ? all[s.c[1]] : null;
  if (g.ctrl) { g.ctrl.charge = s.ch[0]; g.ctrl.sta = s.sa[0]; }
  if (g.ctrl1) { g.ctrl1.charge = s.ch[1]; g.ctrl1.sta = s.sa[1]; }
  const st = ['kickoff', 'play', 'goal', 'ended'][s.st] || g.state;
  if (st !== g.state) {
    if (st === 'goal') { const team = s.sc[0] > g.score[0] ? 0 : 1; g.shake = 14; confetti(g); SFX.goal(); banner('GOL!', g.spec ? g.codes[team] + ' mencetak gol' : (team === g.me ? 'Gol untuk kamu' : 'Lawan mencetak gol'), 2200); }
    else if (st === 'kickoff') { banner('KICKOFF', '', 1200); SFX.whistle(); }
    else if (st === 'ended') { g.endT = 1.5; SFX.whistle(); banner('WAKTU HABIS', '', 1600); }
    else if (st === 'play') SFX.whistle();
    g.state = st;
  }
  g.score = s.sc.slice(); g.timer = s.tm;
  if (s.pz && performance.now() - NET.pzT > 900) { NET.pzT = performance.now(); banner('JEDA', 'Tuan rumah menjeda permainan', 1000); }
  if (g.state === 'ended' && !g.endShown) { g.endT -= dt; if (g.endT <= 0) showEnd(); }
}

/* UI ruangan */
const rmFill = () => {
  $('#rmTeam').innerHTML = TEAMS.map(t => '<option value="' + t.code + '">' + t.name + '</option>').join('');
  $('#rmForm').innerHTML = Object.keys(FORMS).map(k => '<option value="' + k + '">' + k + ' · ' + FORMS[k].name + '</option>').join('');
};
rmFill();
function renderRoomStatus() {
  if (!NET.nr) return;
  const host = NET.role === 'host', peers = NET.nr.peers();
  const other = peers.find(p => !p.isMe && p.presence.role === (host ? 'guest' : 'host'));
  const ot = other && TEAM[other.presence.tm] ? TEAM[other.presence.tm] : null;
  $('#rmStatus').innerHTML = '<div class="pl">' + crest(TEAM[P.team], 32) + '<span>Kamu (' + (host ? 'tuan rumah' : 'tamu') + ') · ' + TEAM[P.team].name + (!host ? (NET.ready ? ' · siap ✓' : '') : '') + '</span></div>'
    + (other ? '<div class="pl">' + crest(ot || TEAM.IDN, 32) + '<span>Teman (' + (host ? 'tamu' : 'tuan rumah') + ')' + (ot ? ' · ' + ot.name : '') + (host ? (other.presence.rd ? ' · siap ✓' : ' · belum siap') : '') + '</span></div>' : '<div class="pl dim">Menunggu teman bergabung…</div>');
  const act = $('#rmAction');
  if (host) { act.textContent = 'Mulai pertandingan'; act.disabled = !(other && other.presence.rd); act.style.opacity = act.disabled ? .45 : 1; }
  else { act.textContent = NET.ready ? 'Batal siap' : 'Saya siap'; act.disabled = !other; act.style.opacity = act.disabled ? .45 : 1; }
}
function renderRoom() {
  $('#olMenu').hidden = true; $('#olRoom').hidden = false;
  $('#rmCode').textContent = NET.code; $('#rmTeam').value = P.team; $('#rmForm').value = P.form; $('#rmDur').value = String(S.dur);
  $('#rmDurRow').style.display = NET.role === 'host' ? '' : 'none';
  const names = starObjs().map(x => x.name);
  $('#rmSquad').textContent = names.length ? 'Pemain bintang: ' + names.join(', ') : 'Belum ada pemain bintang di skuadmu. Beli di toko.';
  renderRoomStatus();
}
function onlineShow() {
  const lo = TEAM[P.opp];
  $('#olLocalInfo').textContent = 'Berdua di satu perangkat: pemain 2 memakai tim ' + lo.name + ' (ubah lewat menu Pertandingan, bagian Lawan).';
  if (NET.nr) { netHello(); renderRoom(); } else { $('#olMenu').hidden = false; $('#olRoom').hidden = true; olNote(''); }
}
$('#olHost').addEventListener('click', async () => { if (await netJoin('host', genCode())) renderRoom(); });
$('#olJoin').addEventListener('click', async () => {
  const c = $('#olCode').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length !== 4) { olNote('Masukkan kode 4 karakter dari temanmu.'); return; }
  if (await netJoin('guest', c)) renderRoom();
});
$('#olLocal').addEventListener('click', () => startGame('match', null, { versus: { mode: 'local', codes: [P.team, P.opp], forms: [P.form, '2-2'], stars: [P.squad.slice(0, 2), []], dur: S.dur } }));
$('#rmTeam').addEventListener('change', e => { P.team = e.target.value; saveP(); netHello(); renderRoom(); });
$('#rmForm').addEventListener('change', e => { P.form = e.target.value; saveP(); netHello(); });
$('#rmDur').addEventListener('change', e => { S.dur = +e.target.value; syncSeg(); });
$('#rmLineup').addEventListener('click', () => { lineupFrom = 'online'; show('lineup'); });
$('#rmLeave').addEventListener('click', async () => { await netLeave(); onlineShow(); });
$('#rmAction').addEventListener('click', () => {
  if (NET.role === 'host') hostStart(); else { NET.ready = NET.ready ? 0 : 1; netHello(); renderRoomStatus(); }
});

/* ---------------- Jeda / hasil ---------------- */
function pause() {
  if (!G || G.paused || G.state === 'ended') return;
  G.paused = true; clearInput();
  $('#pRestart').style.display = G.versus && G.net ? 'none' : '';
  $('#pauseMeta').textContent = G.versus ? G.codes[0] + ' vs ' + G.codes[1] + ' · main bareng teman' : G.mode === 'match' ? G.codes[0] + ' vs ' + G.codes[1] + ' · lawan ' + ['mudah', 'sedang', 'sulit'][S.diff] : G.cfg.title;
  $('#pSound').textContent = 'Suara: ' + (S.sound ? 'nyala' : 'mati');
  $('#pauseOv').classList.add('on');
}
function resume() {
  if (!G || !G.paused) return;
  G.paused = false; $('#pauseOv').classList.remove('on'); last = performance.now();
}
function showEnd() {
  const g = G; g.endShown = true;
  const me = g.me || 0, a = g.score[me], b = g.score[1 - me];
  let title = a > b ? 'Menang!' : a < b ? 'Kalah' : 'Seri', extra = '', reward = (a > b ? 120 : a === b ? 50 : 25) + a * 15;
  if (g.versus) {
    const v = g.versus;
    if (v.mode === 'local') { reward = 0; title = g.score[0] > g.score[1] ? 'Pemain 1 menang!' : g.score[0] < g.score[1] ? 'Pemain 2 menang!' : 'Seri'; }
    else if (g.spec) { reward = 0; title = 'Pertandingan selesai'; }
    else reward = (a > b ? 100 : a === b ? 50 : 25) + a * 10;
    $('#eAgain').textContent = v.mode === 'local' ? 'Main lagi' : 'Kembali ke ruangan';
  } else if (g.event) {
    const ev = P[g.event]; let pw = false;
    if (g.event === 'wc' && ev && ev.stage !== 'group' && a === b) { pw = Math.random() < .5 + (TEAM[ev.me].pow - TEAM[g.codes[1]].pow) * .05; title = pw ? 'Menang adu penalti!' : 'Kalah adu penalti'; }
    const prize = evOnMatchEnd(g.event, a, b, pw);
    if (prize) extra = ' · hadiah event +' + prize;
    $('#eAgain').textContent = 'Lihat event';
  } else $('#eAgain').textContent = 'Main lagi';
  P.coins += reward; saveP(); renderCoins();
  $('#endTitle').textContent = title;
  $('#endScore').textContent = a + ' - ' + b;
  $('#endMeta').textContent = g.codes[me] + ' vs ' + g.codes[1 - me] + (g.versus ? '' : ' · ' + ['Mudah', 'Sedang', 'Sulit'][S.diff]) + (reward ? ' · +' + reward + ' koin' : '') + extra;
  $('#endOv').classList.add('on');
}
function toLobby() { if (G && G.net) netLeave(); G = null; clearInput(); $('#pauseOv').classList.remove('on'); $('#endOv').classList.remove('on'); show('lobby'); }
function restart() { const m = G.mode, d = G.drillKey, o = G.opts; startGame(m === 'match' ? 'match' : 'train', d, o); }
$('#btnPause').addEventListener('click', pause);
$('#btnReset').addEventListener('click', resetBall);
$('#pResume').addEventListener('click', resume);
$('#pRestart').addEventListener('click', restart);
$('#pLobby').addEventListener('click', toLobby);
$('#pSound').addEventListener('click', () => { S.sound = !S.sound; syncSeg(); $('#pSound').textContent = 'Suara: ' + (S.sound ? 'nyala' : 'mati'); });
$('#eAgain').addEventListener('click', () => { if (G && G.versus && G.versus.mode !== 'local') { G = null; clearInput(); $('#pauseOv').classList.remove('on'); $('#endOv').classList.remove('on'); show('online'); } else if (G && G.event) { evKind = G.event; G = null; clearInput(); $('#pauseOv').classList.remove('on'); $('#endOv').classList.remove('on'); show('evdetail'); } else restart(); });
$('#eLobby').addEventListener('click', toLobby);
$('#goMatch').addEventListener('click', () => startGame('match'));
$$('[data-drill]').forEach(b => b.addEventListener('click', () => startGame('train', b.dataset.drill)));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

/* ---------------- Loop ---------------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
  if (G && G.net) netTick(dt);
  if (G && $('#game').classList.contains('active')) { update(dt); render(dt); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Di ponsel: coba layar penuh + kunci landscape pada sentuhan pertama (jika didukung browser)
let landTried = false;
document.addEventListener('pointerdown', () => {
  if (landTried || typeof matchMedia !== 'function' || !matchMedia('(pointer:coarse)').matches) return;
  landTried = true;
  try {
    const el = document.documentElement;
    Promise.resolve(el.requestFullscreen ? el.requestFullscreen() : null)
      .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
      .catch(() => {});
  } catch (e) {}
});
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
// Scroll menu saat tampilan diputar 90 derajat: browser tidak memetakan arah geser dengan benar, jadi diatur manual
(() => {
  let st = null, mom = 0, suppress = false;
  const pt = t => rotated() ? { x: t.clientY, y: window.innerWidth - t.clientX } : { x: t.clientX, y: t.clientY };
  const findScroller = (el, dx, dy) => {
    for (; el && el !== document.body; el = el.parentElement) {
      const cs = getComputedStyle(el);
      const oy = /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1;
      const ox = /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1;
      if ((Math.abs(dy) >= Math.abs(dx) && oy) || (Math.abs(dx) > Math.abs(dy) && ox)) return el;
    }
    return null;
  };
  document.addEventListener('touchstart', e => {
    cancelAnimationFrame(mom);
    if (!rotated() || e.touches.length !== 1 || !e.target.closest || !e.target.closest('.overlay.on, .screen.active:not(#game)')) { st = null; return; }
    const p = pt(e.touches[0]);
    st = { x0: p.x, y0: p.y, x: p.x, y: p.y, t: performance.now(), vx: 0, vy: 0, sc: null, el: e.target, moved: false };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!st) return;
    const p = pt(e.touches[0]), dx = p.x - st.x, dy = p.y - st.y, now = performance.now(), dt = Math.max(1, now - st.t);
    if (!st.sc) { const tx = p.x - st.x0, ty = p.y - st.y0; if (Math.hypot(tx, ty) < 6) return; st.sc = findScroller(st.el, tx, ty) || false; }
    if (!st.sc) return;
    e.preventDefault(); st.moved = true;
    st.sc.scrollTop -= dy; st.sc.scrollLeft -= dx;
    st.vx = dx / dt * .6 + st.vx * .4; st.vy = dy / dt * .6 + st.vy * .4;
    st.x = p.x; st.y = p.y; st.t = now;
  }, { passive: false });
  const end = () => {
    if (!st) return;
    const s2 = st; st = null;
    if (!s2.sc) return;
    suppress = s2.moved; setTimeout(() => { suppress = false; }, 80);
    let vx = s2.vx * 16, vy = s2.vy * 16;
    const go = () => { s2.sc.scrollTop -= vy; s2.sc.scrollLeft -= vx; vx *= .94; vy *= .94; if (Math.abs(vx) + Math.abs(vy) > .4) mom = requestAnimationFrame(go); };
    if (Math.abs(vx) + Math.abs(vy) > 2) mom = requestAnimationFrame(go);
  };
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', end, { passive: true });
  document.addEventListener('click', e => { if (suppress) { e.stopPropagation(); e.preventDefault(); } }, true);
})();
})();

/* Splash, layar penuh, dan nuansa game */
(() => {
  const sp = document.getElementById('splash'), lobby = document.getElementById('lobby'), fs = document.getElementById('fsBtn');
  const de = document.documentElement;
  const rfs = de.requestFullscreen || de.webkitRequestFullscreen, efs = document.exitFullscreen || document.webkitExitFullscreen;
  const inFS = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  function enterFS() {
    try { const r = rfs && rfs.call(de, { navigationUI: 'hide' }); r && r.catch && r.catch(() => {}); } catch (e) {}
    try { const l = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); l && l.catch && l.catch(() => {}); } catch (e) {}
    try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); } catch (e) {}
  }
  if (rfs && fs) {
    fs.hidden = false;
    fs.addEventListener('click', () => { if (inFS()) { try { efs.call(document); } catch (e) {} } else enterFS(); });
  }
  function chime() {
    try {
      const A = window.AudioContext || window.webkitAudioContext, c = new A(), t = c.currentTime;
      [523, 784, 1047].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * .07); g.gain.linearRampToValueAtTime(.18, t + i * .07 + .02); g.gain.exponentialRampToValueAtTime(.001, t + i * .07 + .35);
        o.connect(g); g.connect(c.destination); o.start(t + i * .07); o.stop(t + i * .07 + .4); });
    } catch (e) {}
  }
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  let ready = false, done = false;
  setTimeout(() => { ready = true; sp.classList.add('ready'); }, reduce ? 300 : 2700);
  const boot = document.getElementById('boot'), wel = document.getElementById('welcome');
  /* Coba kunci landscape sejak awal (berhasil saat dibuka sebagai aplikasi layar penuh) */
  try { const l = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); l && l.catch && l.catch(() => {}); } catch (e) {}
  /* Service worker: syarat aplikasi bisa dipasang dan jalan offline */
  try { if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
  function start() {
    if (!ready || done) return; done = true;
    chime();
    boot.classList.remove('off'); boot.classList.add('on');   /* layar hitam saat berputar, seperti membuka game */
    enterFS();
    let fin = false;
    const finish = () => {
      if (fin) return; fin = true; window.removeEventListener('resize', onRz);
      sp.remove(); lobby.classList.add('enter');
      requestAnimationFrame(() => { boot.classList.remove('on'); boot.classList.add('off'); });
      setTimeout(() => wel.classList.add('show'), 500);
      setTimeout(() => wel.classList.remove('show'), 3400);
      setTimeout(() => lobby.classList.remove('enter'), 1500);
    };
    const t0 = performance.now();
    const onRz = () => setTimeout(finish, Math.max(0, 450 - (performance.now() - t0)));
    window.addEventListener('resize', onRz);
    setTimeout(finish, reduce ? 100 : 1000);
  }
  sp.addEventListener('click', start);
  sp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } });
  document.addEventListener('contextmenu', e => { if (!/INPUT|TEXTAREA/.test(e.target.tagName)) e.preventDefault(); });
})();
