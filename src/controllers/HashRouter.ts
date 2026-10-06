import { isScreenName, type ScreenName } from '../models/types';

/** Keeps the current screen in the URL hash (#scan, #result, ...) so reviewers can link to a screen. */
export class HashRouter {
  constructor(private readonly location: Location, private readonly history: History) {}

  read(): ScreenName | null {
    const value = this.location.hash.replace(/^#/, '');
    return isScreenName(value) ? value : null;
  }

  write(screen: ScreenName): void {
    if (this.read() === screen) return;
    this.history.replaceState(null, '', `#${screen}`);
  }
}
