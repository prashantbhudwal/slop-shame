// Necessary literal guard table, decoded once.
import{RUNTIME}from './runtime-data';
export const GUARD_IDS=RUNTIME[9] as Readonly<Record<string,number>>;
export const GUARD_NODES=RUNTIME[10] as readonly {next:Record<string,number>;fail:number;outputs:number[]}[];
export const GUARD_COUNT=RUNTIME[11] as number;
