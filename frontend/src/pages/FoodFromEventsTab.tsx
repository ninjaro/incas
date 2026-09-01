import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeoJsonProperties, FeatureCollection, Geometry } from "geojson";
import worldTopo from "world-atlas/countries-110m.json";

import { RECIPE_BOOK, RECIPE_COUNT } from "./recipeBook";
import type { BookCountry, BookRecipe } from "./recipeBook";
import { downloadRecipeCard } from "../utils/recipeCards";

type LandFeatures = FeatureCollection<Geometry, GeoJsonProperties>;

const MAP_W = 1000;

const mapGeometry = (() => {
  const topo = worldTopo as unknown as Parameters<typeof feature>[0];
  const countries = (topo as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects.countries;
  const land = feature(topo, countries) as unknown as LandFeatures;
  land.features = land.features.filter((f) => f.id !== "010");
  const projection = geoNaturalEarth1().fitWidth(MAP_W, land);
  const path = geoPath(projection);
  const height = Math.ceil(path.bounds(land)[1][1]);
  return { landPath: path(land) ?? "", projection, height };
})();

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

type MapView = { k: number; x: number; y: number };

function clampView(view: MapView): MapView {
  const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.k));
  return {
    k,
    x: Math.max(MAP_W * (1 - k), Math.min(0, view.x)),
    y: Math.max(mapGeometry.height * (1 - k), Math.min(0, view.y)),
  };
}

/** The interactive map: one pushpin per country, zoomable by wheel, drag,
    buttons, or by picking a pin. */
function RecipeMap({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const pins = useMemo(
    () =>
      RECIPE_BOOK.map((country) => {
        const point = mapGeometry.projection(country.coordinates);
        return { country, x: point?.[0] ?? 0, y: point?.[1] ?? 0 };
      }),
    [],
  );
  const [view, setView] = useState<MapView>({ k: 1, x: 0, y: 0 });
  const [smooth, setSmooth] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef({ active: false, moved: false, lastX: 0, lastY: 0 });

  const toLocal = (clientX: number, clientY: number): [number, number] => {
    const rect = svgRef.current!.getBoundingClientRect();
    return [((clientX - rect.left) * MAP_W) / rect.width, ((clientY - rect.top) * mapGeometry.height) / rect.height];
  };

  const zoomAt = (px: number, py: number, factor: number) => {
    const current = viewRef.current;
    const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.k * factor));
    const scale = k / current.k;
    setSmooth(false);
    setView(clampView({ k, x: px - (px - current.x) * scale, y: py - (py - current.y) * scale }));
  };

  const zoomCenter = (factor: number) => {
    const current = viewRef.current;
    const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.k * factor));
    const scale = k / current.k;
    const cx = MAP_W / 2;
    const cy = mapGeometry.height / 2;
    setSmooth(true);
    setView(clampView({ k, x: cx - (cx - current.x) * scale, y: cy - (cy - current.y) * scale }));
  };

  // React's root-level wheel listener is passive, so the page would scroll while
  // zooming: attach a native non-passive listener instead.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const [px, py] = toLocal(event.clientX, event.clientY);
      zoomAt(px, py, event.deltaY < 0 ? 1.3 : 1 / 1.3);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const selectPin = (country: BookCountry, isActive: boolean) => {
    if (drag.current.moved) return;
    onSelect(isActive ? null : country.id);
  };

  return (
    <div className="food-map" role="group" aria-label="Recipes by country">
      <svg
        viewBox={`0 0 ${MAP_W} ${mapGeometry.height}`}
        className={`food-map-svg${view.k > 1 ? " is-zoomed" : ""}`}
        ref={svgRef}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          drag.current = { active: true, moved: false, lastX: event.clientX, lastY: event.clientY };
          // Do NOT capture the pointer here: with a capture active the browser
          // retargets the follow-up click to the svg, so pin clicks never fire.
          // Capture only once an actual drag starts (below).
        }}
        onPointerMove={(event) => {
          if (!drag.current.active) return;
          const dxClient = event.clientX - drag.current.lastX;
          const dyClient = event.clientY - drag.current.lastY;
          if (!drag.current.moved && Math.hypot(dxClient, dyClient) < 4) return;
          if (!drag.current.moved) {
            try { (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId); } catch { /* fine */ }
          }
          drag.current.moved = true;
          drag.current.lastX = event.clientX;
          drag.current.lastY = event.clientY;
          const rect = svgRef.current!.getBoundingClientRect();
          const dx = (dxClient * MAP_W) / rect.width;
          const dy = (dyClient * mapGeometry.height) / rect.height;
          setSmooth(false);
          setView((current) => clampView({ ...current, x: current.x + dx, y: current.y + dy }));
        }}
        onPointerUp={() => {
          drag.current.active = false;
          // let the click that follows this pointerup see whether it was a drag
          window.setTimeout(() => { drag.current.moved = false; }, 0);
        }}
      >
        <g
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
            transition: smooth ? "transform 0.45s cubic-bezier(0.16, 0.84, 0.28, 1)" : "none",
          }}
        >
          <path d={mapGeometry.landPath} fill="#e2cb9c" stroke="#d9bf8b" strokeWidth={0.6} />
          {pins.map(({ country, x, y }) => {
            const isActive = selected === country.id;
            return (
              <g
                key={country.id}
                className={`food-pin${isActive ? " is-active" : ""}`}
                transform={`translate(${x}, ${y}) scale(${1 / view.k})`}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                aria-label={`${country.country}: ${country.recipes.length} ${country.recipes.length === 1 ? "recipe" : "recipes"}`}
                onClick={() => selectPin(country, isActive)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectPin(country, isActive);
                  }
                }}
              >
                <circle className="food-pin-halo" r={22} />
                <circle className="food-pin-head" r={10} />
                <circle className="food-pin-shine" r={3} cx={-2.6} cy={-3} />
                <text className="food-pin-label" y={26}>{country.country}</text>
                <text className="food-pin-count" y={39}>
                  {country.recipes.length} {country.recipes.length === 1 ? "recipe" : "recipes"}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="food-map-controls">
        <button type="button" aria-label="Zoom in" onClick={() => zoomCenter(1.6)} disabled={view.k >= MAX_ZOOM}>
          <i className="bi bi-plus-lg" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomCenter(1 / 1.6)} disabled={view.k <= MIN_ZOOM}>
          <i className="bi bi-dash-lg" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Reset the map view"
          onClick={() => { setSmooth(true); setView({ k: 1, x: 0, y: 0 }); }}
          disabled={view.k === 1 && view.x === 0 && view.y === 0}
        >
          <i className="bi bi-arrows-angle-contract" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function BookRecipeCard({ recipe, country }: { recipe: BookRecipe; country: BookCountry }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`rec-dish${open ? " is-open" : ""}`}>
      <div className="rec-dish-head">
        <div>
          <h3>{recipe.dish}</h3>
          <p>
            {recipe.note}{" "}
            {recipe.recordId ? (
              <Link to={`/events/archive/${recipe.recordId}`} className="food-record-link">
                From {recipe.eventLabel} <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            ) : (
              <span className="food-event-label">· {recipe.eventLabel}</span>
            )}
          </p>
        </div>
        {recipe.recipe ? (
          <button type="button" className="btn btn-outline btn-sm" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? "Fold the recipe away" : "Open the recipe"}
          </button>
        ) : (
          <span className="rec-dish-none">No recipe kept</span>
        )}
      </div>
      {open && recipe.recipe ? (
        <div className="rec-recipe">
          <div className="rec-recipe-top">
            <span className="rec-recipe-kicker">Recipe card · {recipe.recipe.serves}</span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => downloadRecipeCard(recipe.dish, recipe.eventLabel, recipe.recipe!)}
            >
              <i className="bi bi-download" aria-hidden="true" /> Save the card
            </button>
          </div>
          <div className="rec-recipe-cols">
            <div>
              <h4>Ingredients</h4>
              <ul>{recipe.recipe.ingredients.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <h4>How it went</h4>
              <ol>{recipe.recipe.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function FoodFromEvents() {
  const [selected, setSelected] = useState<string | null>(null);
  const bookHeadRef = useRef<HTMLDivElement>(null);
  const countries = selected ? RECIPE_BOOK.filter((country) => country.id === selected) : RECIPE_BOOK;

  // A pin click is a filter: bring the filtered book into view so the click
  // visibly does something, instead of zooming the map.
  const selectCountry = (id: string | null) => {
    setSelected(id);
    if (id) {
      window.requestAnimationFrame(() => {
        bookHeadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  return (
    <section aria-label="Food from events">
      <p className="events-note">
        Every dish cooked at an event ends up here: pinned to the country it came from, with the
        recipe kept so you can cook it at home. Tap a pin to open that country's page of the book.
      </p>

      <RecipeMap selected={selected} onSelect={selectCountry} />

      <div className="food-book-head" ref={bookHeadRef}>
        <h2>The recipe book</h2>
        <span className="count">
          {selected
            ? `${countries[0]?.country} · ${countries[0]?.recipes.length ?? 0} on file`
            : `${RECIPE_COUNT} recipes from ${RECIPE_BOOK.length} corners of the world`}
        </span>
        {selected ? (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelected(null)}>
            Show every country
          </button>
        ) : null}
      </div>

      <div className="food-book">
        {countries.map((country) => (
          <section className="food-country" key={country.id} aria-label={country.country}>
            <h3 className="food-country-head">
              <span className="food-country-pin" aria-hidden="true" />
              {country.country}
            </h3>
            <div className="rec-dishes">
              {country.recipes.map((recipe) => (
                <BookRecipeCard recipe={recipe} country={country} key={recipe.dish} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="board-note">
        <h2>Cooked something at an event?</h2>
        <p>Hand the recipe to the team and it goes into the book with your country's pin.</p>
      </div>
    </section>
  );
}
