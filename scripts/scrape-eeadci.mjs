/**
 * Scrape EEADCI church directory from eeadci.org
 * Structure: each region page has div.bloc_page_annuaire_legende (locality)
 *            + div.bloc_page_annuaire_liste_temple (pastor + schedule per temple)
 */
import { writeFileSync } from 'fs';

const BASE = 'http://www.eeadci.org/main.php';
const DELAY = 700; // ms between requests

const REGIONS = [
  { id: 23, name: 'Abengourou',     district: 'Comoé' },
  { id: 34, name: 'Abidjan-Centre', district: 'Abidjan' },
  { id: 21, name: 'Abidjan-Est',    district: 'Abidjan' },
  { id: 20, name: 'Abidjan-Nord',   district: 'Abidjan' },
  { id: 19, name: 'Abidjan-Ouest',  district: 'Abidjan' },
  { id: 18, name: 'Abidjan-Sud',    district: 'Abidjan' },
  { id: 22, name: 'Aboisso',        district: 'Comoé' },
  { id: 17, name: 'Adzopé',         district: 'Lagunes' },
  { id: 16, name: 'Agboville',      district: 'Lagunes' },
  { id: 35, name: 'Agnibilékrou',   district: 'Comoé' },
  { id: 15, name: 'Bondoukou',      district: 'Gontougo' },
  { id: 14, name: 'Bouaflé',        district: 'Sassandra-Marahoué' },
  { id: 37, name: 'Bouaké-Est',     district: 'Vallée du Bandama' },
  { id: 38, name: 'Bouaké-Ouest',   district: 'Vallée du Bandama' },
  { id:  2, name: 'Dabou',          district: 'Lagunes' },
  { id:  3, name: 'Daloa',          district: 'Sassandra-Marahoué' },
  { id: 30, name: 'Danané',         district: 'Montagnes' },
  { id:  4, name: 'Daoukro',        district: 'Lacs' },
  { id:  5, name: 'Divo',           district: 'Gôh-Djiboua' },
  { id:  6, name: 'Gagnoa',         district: 'Gôh-Djiboua' },
  { id:  7, name: 'Guiglo',         district: 'Montagnes' },
  { id:  8, name: 'Korhogo',        district: 'Savanes' },
  { id:  9, name: 'Man',            district: 'Montagnes' },
  { id: 39, name: 'Odienné',        district: 'Denguélé' },
  { id: 10, name: 'San Pedro',      district: 'Bas-Sassandra' },
  { id: 24, name: 'Sassandra',      district: 'Bas-Sassandra' },
  { id: 28, name: 'Séguéla',        district: 'Woroba' },
  { id: 25, name: 'Sikensi',        district: 'Lagunes' },
  { id: 26, name: 'Soubré',         district: 'Bas-Sassandra' },
  { id: 27, name: 'Tabou',          district: 'Bas-Sassandra' },
  { id: 29, name: 'Yamoussoukro',   district: 'Yamoussoukro' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

const stripTags = s =>
  s.replace(/<[^>]+>/g, ' ')
   .replace(/&nbsp;/g, ' ')
   .replace(/&amp;/g, '&')
   .replace(/&apos;/g, "'")
   .replace(/&#039;/g, "'")
   .replace(/&eacute;/g, 'é')
   .replace(/&egrave;/g, 'è')
   .replace(/&agrave;/g, 'à')
   .replace(/&ccedil;/g, 'ç')
   .replace(/&ocirc;/g, 'ô')
   .replace(/&ecirc;/g, 'ê')
   .replace(/&iuml;/g, 'ï')
   .replace(/\s+/g, ' ')
   .trim();

function parseChurches(html, region) {
  const churches = [];

  // Extract the presentation bloc
  const blocStart = html.indexOf('bloc_page_annuaire_presentation');
  if (blocStart < 0) return churches;
  const blocEnd = html.indexOf('</div>', html.indexOf('<!-- BLOC VILLES -->', blocStart + 100));
  const content = html.slice(blocStart, blocEnd > 0 ? blocEnd + 500 : blocStart + 50000);

  // Each locality block: <div class="bloc_page_annuaire_legende">LOCALITY</div>
  const legendeRe = /<div class="bloc_page_annuaire_legende">([\s\S]*?)<\/div>/gi;
  // Each temple block: <div class="bloc_page_annuaire_liste_temple"[^>]*>([\s\S]*?)<\/div>
  const templeRe = /<div class="bloc_page_annuaire_liste_temple"[^>]*>([\s\S]*?)<\/div>/gi;

  // Collect localities and their positions
  const localities = [];
  let m;
  while ((m = legendeRe.exec(content)) !== null) {
    localities.push({ name: stripTags(m[1]), idx: m.index });
  }

  // Collect temple blocks
  const temples = [];
  while ((m = templeRe.exec(content)) !== null) {
    temples.push({ html: m[1], idx: m.index });
  }

  // Match each temple to its closest preceding locality
  for (const temple of temples) {
    let locality = 'N/A';
    for (const loc of localities) {
      if (loc.idx <= temple.idx) locality = loc.name;
      else break;
    }

    // Extract pastor from "Pasteur Principal : NAME"
    const pastorMatch = temple.html.match(/Pasteur\s+Principal\s*:\s*([^\n<]+)/i);
    const pastor = pastorMatch ? pastorMatch[1].replace(/<[^>]+>/g, '').trim() : 'N/A';

    if (locality !== 'N/A') {
      churches.push({
        name: `Assemblée de Dieu de ${locality}`,
        city: locality,
        region: region.name,
        district: region.district,
        pastor: pastor || 'N/A',
      });
    }
  }

  return churches;
}

async function fetchPage(regionId) {
  const url = `${BASE}?rub=annuaire&region=${regionId}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const allChurches = [];

console.warn('Scraping EEADCI directory...\n');

for (const region of REGIONS) {
  process.stdout.write(`  Région ${region.id} — ${region.name}: `);

  const html = await fetchPage(region.id);
  if (!html) {
    console.warn('erreur réseau');
    await sleep(DELAY);
    continue;
  }

  const churches = parseChurches(html, region);
  allChurches.push(...churches);
  console.warn(`${churches.length} église(s)`);
  await sleep(DELAY);
}

// Build CSV
const BOM = '﻿';
const sep = ';';
const q = v => '"' + String(v ?? 'N/A').replace(/"/g, '""').trim() + '"';
const headers = ["Pays", "Nom de l'église", "Ville", "Région EEADCI", "District administratif", "Adresse complète", "Pasteur / Responsable", "Actif"];

const rows = allChurches.map(c => [
  "Côte d'Ivoire",
  c.name,
  c.city,
  c.region,
  c.district,
  'N/A',
  c.pastor,
  'Oui',
].map(q).join(sep));

const csv = BOM + [headers.map(q).join(sep), ...rows].join('\r\n');
writeFileSync('churches_CI.csv', csv, 'utf-8');

console.warn(`\n✓ ${allChurches.length} assemblées exportées → churches_CI.csv`);
