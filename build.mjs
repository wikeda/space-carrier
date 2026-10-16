import { mkdir, copyFile, cp, writeFile } from "node:fs/promises";
await mkdir("vendor", { recursive: true });
for (const f of ["three.module.js", "three.core.js"])
  await copyFile("node_modules/three/build/" + f, "vendor/" + f);
await copyFile("node_modules/three/LICENSE", "vendor/THREE-LICENSE.txt");
await mkdir("dist", { recursive: true });
for (const f of ["index.html", "style.css", "icon.svg"])
  await copyFile(f, "dist/" + f);
for (const d of ["src", "vendor"])
  await cp(d, "dist/" + d, { recursive: true });
await writeFile("dist/.nojekyll", "");
console.log(
  "Static build ready: dist/ (all module URLs relative, Three.js 0.180.0 bundled)",
);
