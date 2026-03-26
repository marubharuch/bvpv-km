// hooks/useContactPicker.js
// Wraps the browser Contact Picker API with a clean React hook.

import { useState, useCallback } from 'react';

export function useContactPicker() {
  const [picking, setPicking] = useState(false);

  // Check if the Contact Picker API is available (Chrome Android mostly)
  const isSupported =
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    'ContactsManager' in window;

  /**
   * Opens the native contact picker.
   * Returns an array of { name, phone, hasCountryCode, countryCode } objects.
   * Returns [] on cancel or error.
   */
  const pick = useCallback(async () => {
    if (!isSupported) return [];
    setPicking(true);
    try {
      const contacts = await navigator.contacts.select(
        ['name', 'tel'],
        { multiple: true }
      );

      return contacts.flatMap(c => {
        const name  = c.name?.[0] || '';
        const tels  = c.tel || [];

        return tels.map(tel => {
          const raw            = tel.trim();
          const hasCountryCode = raw.startsWith('+');
          // Very naïve: extract CC as first 1-3 digits after '+'
          let countryCode = '+91'; // default India
          if (hasCountryCode) {
            const match = raw.match(/^\+(\d{1,3})/);
            if (match) countryCode = `+${match[1]}`;
          }
          const phone = hasCountryCode
            ? raw.replace(/^\+\d{1,3}/, '').replace(/\D/g, '')
            : raw.replace(/\D/g, '');

          return { name, phone, hasCountryCode, countryCode };
        });
      });
    } catch (e) {
      // User cancelled or API error — silently return empty
      console.warn('Contact picker:', e.message);
      return [];
    } finally {
      setPicking(false);
    }
  }, [isSupported]);

  return { pick, picking, isSupported };
}
