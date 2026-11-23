/**
 * @jest-environment jsdom
 */

/**
 * The map's failure path, which is the behaviour the one suppression in this file
 * excuses.
 *
 * ListingMap.tsx carries an eslint-disable for react-hooks/set-state-in-effect on
 * `catch { setMapError(true) }`. The rule is correct that it is a synchronous setState
 * in an effect; it is wrong that the render is avoidable, because whether
 * `new mapboxgl.Map(...)` throws cannot be known until it is called, and it can only
 * be called once a DOM node exists to mount into.
 *
 * Silencing a rule is only defensible if the behaviour it was pointing at is held by
 * something else. That is what this file is for: without it, the suppression would
 * leave the failure path completely unguarded.
 */

const mapInstance = {
  addControl: jest.fn(),
  on: jest.fn(),
  remove: jest.fn(),
  addSource: jest.fn(),
  addLayer: jest.fn(),
};

const mapConstructor = jest.fn(() => mapInstance);

jest.mock("mapbox-gl", () => ({
  __esModule: true,
  default: {
    accessToken: "pk.test-token",
    Map: function (...args: unknown[]) {
      return mapConstructor(...(args as []));
    },
    NavigationControl: function () {
      return {};
    },
    Marker: function () {
      return { setLngLat: () => ({ addTo: () => {} }) };
    },
  },
}));
jest.mock("mapbox-gl/dist/mapbox-gl.css", () => ({}), { virtual: true });

import { render, act } from "@testing-library/react";
import mapboxgl from "mapbox-gl";
import { ListingMap } from "../ListingMap";

const BASE = {
  latitude: -1.2921,
  longitude: 36.8219,
  address: "Riverside Drive",
  area: "Kilimani",
  city: "Nairobi",
  landmarks: null,
  buildingName: null,
  hideExactAddress: false,
};

beforeEach(() => {
  mapConstructor.mockReset();
  mapConstructor.mockReturnValue(mapInstance);
  mapInstance.on.mockReset();
  // ListingMap.tsx runs `mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  // || ""` at module scope, which blanks the mock's token because the variable is not
  // set under jest. The component then takes its no-token path and never builds a map
  // — which is correct behaviour, and made two of these tests look like product
  // failures when they were fixture failures.
  (mapboxgl as unknown as { accessToken: string }).accessToken =
    "pk.test-token";
});

describe("when the map constructor throws", () => {
  it("shows the fallback instead of an empty frame", () => {
    mapConstructor.mockImplementation(() => {
      throw new Error("WebGL unavailable");
    });

    const view = render(<ListingMap {...BASE} />);

    expect(view.container.textContent).toContain("Map not available");
  });

  it("still renders the address and the landmarks around it", () => {
    mapConstructor.mockImplementation(() => {
      throw new Error("WebGL unavailable");
    });

    const view = render(
      <ListingMap {...BASE} landmarks="Yaya Centre, Kilimani Primary" />,
    );

    // A failed map must not take the rest of the location block down with it.
    expect(view.container.textContent).toContain("Kilimani");
    expect(view.container.textContent).toContain("Yaya Centre");
  });

  it("does not throw out of render", () => {
    mapConstructor.mockImplementation(() => {
      throw new Error("WebGL unavailable");
    });
    expect(() => render(<ListingMap {...BASE} />)).not.toThrow();
  });
});

describe("when mapbox reports an error after construction", () => {
  it("shows the fallback", () => {
    let errorHandler: (() => void) | undefined;
    mapInstance.on.mockImplementation((event: string, cb: () => void) => {
      if (event === "error") errorHandler = cb;
    });

    const view = render(<ListingMap {...BASE} />);
    expect(view.container.textContent).not.toContain("Map not available");

    // This path is a subscription callback, not a synchronous effect write, and is
    // not covered by the suppression — but it ends in the same state, so it is worth
    // holding alongside it.
    expect(errorHandler).toBeDefined();
    act(() => errorHandler?.());

    expect(view.container.textContent).toContain("Map not available");
  });
});

describe("when there is nothing to show a map for", () => {
  it("shows the fallback with no coordinates, and never builds a map", () => {
    const view = render(
      <ListingMap {...BASE} latitude={null} longitude={null} />,
    );

    expect(view.container.textContent).toContain("Map not available");
    expect(mapConstructor).not.toHaveBeenCalled();
  });
});

describe("the happy path still works", () => {
  it("builds the map and shows no fallback", () => {
    const view = render(<ListingMap {...BASE} />);

    expect(mapConstructor).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).not.toContain("Map not available");
  });
});
