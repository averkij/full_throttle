import {SCENES,objective} from './engine.js';
import {t} from './ru.js';

export const openingNarration='Банда исчезла. Ключи исчезли. Головная боль — на месте. Кто-то здесь точно что-то знает.';
export function restoredNarration(state){return `Снова здесь: ${t(SCENES[state.scene].name)}. ${t(objective(state))}`;}
