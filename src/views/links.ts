import type { Language } from '../models/types';

/** The 3D station view, opened in the language the person is using. */
export const station3dHref = (language: Language): string => `./device.html?lang=${language}`;
