/**
 * Import churches_CI.csv into the Supabase churches table via REST API.
 * Run: node --env-file=.env.local scripts/import-churches-ci.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

function parseCSV(raw) {
  const lines = raw.replace(/^﻿/, '').split('\r\n').filter(Boolean);
  const [headerLine, ...dataLines] = lines;
  const headers = headerLine.split(';').map(h => h.replace(/^"|"$/g, ''));

  return dataLines.map(line => {
    const values = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQ) { inQ = true; continue; }
      if (ch === '"' && inQ) {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
        continue;
      }
      if (ch === ';' && !inQ) { values.push(cur); cur = ''; continue; }
      cur += ch;
    }
    values.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

const raw = readFileSync('churches_CI.csv', 'utf-8');
const rows = parseCSV(raw);
console.log(`Parsed ${rows.length} rows`);

// Fetch existing CI church IDs that are referenced (must not delete)
const { data: refChurches } = await supabase
  .from('verification_requests')
  .select('church_id');
const { data: refProfiles } = await supabase
  .from('profiles')
  .select('church_id')
  .not('church_id', 'is', null);
const { data: refReferents } = await supabase
  .from('church_referents')
  .select('church_id');

const protectedIds = new Set([
  ...(refChurches ?? []).map(r => r.church_id),
  ...(refProfiles ?? []).map(r => r.church_id),
  ...(refReferents ?? []).map(r => r.church_id),
]);
console.log(`Protected church IDs (have references): ${protectedIds.size}`);

// Delete unreferenced CI churches
const { data: existingCI } = await supabase
  .from('churches')
  .select('id')
  .eq('country', 'CI');

const toDelete = (existingCI ?? [])
  .filter(r => !protectedIds.has(r.id))
  .map(r => r.id);

if (toDelete.length > 0) {
  const { error } = await supabase.from('churches').delete().in('id', toDelete);
  if (error) console.error('Delete error:', error.message);
  else console.log(`Deleted ${toDelete.length} old CI churches`);
}

// Build insert rows
const batch = rows.map(r => ({
  name: r["Nom de l'église"] || 'N/A',
  city: r['Ville'] || 'N/A',
  region: r['Région EEADCI'] || 'N/A',
  district: r['District administratif'] !== 'N/A' ? r['District administratif'] : null,
  country: 'CI',
  address: r['Adresse complète'] !== 'N/A' ? r['Adresse complète'] : null,
  pastor: r['Pasteur / Responsable'] !== 'N/A' ? r['Pasteur / Responsable'] : null,
  is_active: true,
}));

// Insert in batches of 100
let inserted = 0;
for (let i = 0; i < batch.length; i += 100) {
  const chunk = batch.slice(i, i + 100);
  const { error } = await supabase.from('churches').insert(chunk);
  if (error) { console.error(`\nInsert error at row ${i}:`, error.message); break; }
  inserted += chunk.length;
  process.stdout.write(`\r  Inserted ${inserted}/${batch.length}`);
}

console.log(`\n✓ ${inserted} assemblées importées`);
