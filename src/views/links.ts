import type { Language } from '../models/types';

/** The 3D station view, opened in the staff language (it has Arabic and English only). */
export const station3dHref = (language: Language): string => `./device.html?lang=${language}`;
