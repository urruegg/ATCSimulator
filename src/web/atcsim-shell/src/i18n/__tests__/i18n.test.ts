import { describe, it, expect } from 'vitest';
import i18n from '../index';

describe('i18n', () => {
  it('translates the app title and nav in DE', async () => {
    await i18n.changeLanguage('de');
    expect(i18n.t('app.title')).toBe('ATCSimulator');
    expect(i18n.t('nav.map')).toBe('Karte');
  });
});
