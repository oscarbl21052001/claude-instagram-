import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

const FILES = [
  { family: "Inter", file: "Inter-Medium.woff2", weight: "500" },
  { family: "Inter", file: "Inter-ExtraBold.woff2", weight: "800" },
  { family: "Space Grotesk", file: "SpaceGrotesk-Bold.woff2", weight: "700" },
  { family: "Bebas Neue", file: "BebasNeue-Regular.woff2", weight: "400" },
];

// Carga las tipografías del kit y bloquea el render hasta que estén listas.
export const useKitFonts = () => {
  const [handle] = useState(() => delayRender("Cargando tipografías"));
  useEffect(() => {
    Promise.all(
      FILES.map((f) =>
        loadFont({ family: f.family, url: staticFile(`fonts/${f.file}`), weight: f.weight }),
      ),
    ).then(() => continueRender(handle));
  }, [handle]);
};
