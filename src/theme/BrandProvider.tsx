import React, { createContext, useContext } from "react";
import { type Brand, defaultBrand } from "./tokens";

/**
 * Brand is provided once at the top of a composition and read by every scene
 * via `useBrand()`. The default is `defaultBrand`, so a scene rendered outside
 * a provider (or a video with no `brand`) still looks correct.
 */
const BrandContext = createContext<Brand>(defaultBrand);

export const BrandProvider: React.FC<{
  brand: Brand;
  children: React.ReactNode;
}> = ({ brand, children }) => {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
};

/** Read the active channel's brand tokens (colors + fonts). */
export const useBrand = (): Brand => useContext(BrandContext);
