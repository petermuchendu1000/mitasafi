// Global type declarations
// This file augments global types and should not export anything

interface GoogleMapsAutocomplete {
  addListener: (event: string, handler: () => void) => void;
  getPlace: () => GoogleMapsPlace;
}

interface GoogleMapsPlace {
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  formatted_address?: string;
  geometry?: {
    location?: {
      lat: () => number;
      lng: () => number;
    };
  };
}

interface GoogleMapsAutocompleteOptions {
  componentRestrictions?: { country: string | string[] };
  fields?: string[];
  types?: string[];
}

interface Window {
  google?: {
    maps: {
      places: {
        Autocomplete: new (
          input: HTMLInputElement,
          options?: GoogleMapsAutocompleteOptions
        ) => GoogleMapsAutocomplete;
      };
      event: {
        clearInstanceListeners: (instance: unknown) => void;
      };
    };
  };
}
