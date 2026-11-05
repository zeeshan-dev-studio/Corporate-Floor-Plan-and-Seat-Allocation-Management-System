import { prisma } from '@/lib/prisma';
import { SUPPORT_PROGRAM } from './palette';
import { FloorMapModel, LegendEntry } from './types';

export interface ProgramNeed {
  entry: LegendEntry;
  code: string;
  name: string;
  seats: number;
}

export interface ProgramRef {
  id?: string;
  code: string;
  name: string;
  create: boolean;
}

const codeFrom = (text: string) => text.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase() || 'PRG';

/**
 * Works out which app program each program/support legend entry maps to, and
 * which ones would have to be created. Reads the database, never writes.
 * `seats` limits it to the given seats (default: every seat in the map).
 */
export async function resolveLegendPrograms(
  model: FloorMapModel,
  createMissingPrograms: boolean,
  seats = model.seats
): Promise<{ needs: ProgramNeed[]; programFor: Record<string, ProgramRef>; used: Record<string, number>; errors: string[] }> {
  const errors: string[] = [];
  const used: Record<string, number> = {};
  seats.forEach((s) => (used[s.legendKey] = (used[s.legendKey] || 0) + 1));
  const known = await prisma.program.findMany();
  const byCode = new Map(known.map((p) => [p.code.toLowerCase(), p]));
  const byName = new Map(known.map((p) => [p.name.toLowerCase(), p]));
  const needs: ProgramNeed[] = [];
  const programFor: Record<string, ProgramRef> = {};
  const createdCodes = new Set<string>();
  const createdNames = new Set<string>();

  for (const entry of model.legend) {
    if (!used[entry.key] || (entry.kind !== 'program' && entry.kind !== 'support')) continue;
    const wantCode = (entry.programCode || (entry.kind === 'support' ? SUPPORT_PROGRAM.code : codeFrom(entry.label))).trim();
    const wantName =
      entry.kind === 'support' && wantCode.toUpperCase() === SUPPORT_PROGRAM.code ? SUPPORT_PROGRAM.name : entry.label;
    const found = byCode.get(wantCode.toLowerCase()) || byName.get(wantName.toLowerCase()) || byName.get(wantCode.toLowerCase());
    if (found) {
      programFor[entry.key] = { id: found.id, code: found.code, name: found.name, create: false };
      continue;
    }
    let code = wantCode.toUpperCase();
    let name = wantName;
    // Two legend entries can share one new program (e.g. several support colours)
    const sameNew = Object.values(programFor).find((p) => p.create && (p.code === code || p.name.toLowerCase() === name.toLowerCase()));
    if (sameNew) {
      programFor[entry.key] = sameNew;
      continue;
    }
    while (createdCodes.has(code)) code += '2';
    while (createdNames.has(name.toLowerCase())) name += ' 2';
    createdCodes.add(code);
    createdNames.add(name.toLowerCase());
    programFor[entry.key] = { code, name, create: true };
    needs.push({ entry, code, name, seats: 0 });
  }
  needs.forEach((n) => {
    n.seats = model.legend.reduce((sum, e) => (programFor[e.key] === programFor[n.entry.key] ? sum + (used[e.key] || 0) : sum), 0);
  });
  if (needs.length && !createMissingPrograms) {
    errors.push(
      needs.length + (needs.length === 1 ? ' program in the map does' : ' programs in the map do') + ' not exist yet: ' + needs.map((n) => n.name).join(', ') +
        '. Tick "Create missing programs" or add them first.'
    );
  }
  return { needs, programFor, used, errors };
}
