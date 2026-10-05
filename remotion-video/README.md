# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Welcome to your Remotion project!

## Commands

**Install Dependencies**

```console
npm i --loglevel=error
```

**Start Preview**

```console
npm run dev
```

**Render video**

```console
npx remotion render
```

**Upgrade Remotion**

```console
npx remotion upgrade
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).

## Reel: sujeto + subtítulos + fondos (composición `Reel`)

Capas, de abajo arriba: video original → fondo Matrix → fondo playa → subtítulos
(Poppins ExtraBold) → sujeto recortado. Los ajustes (fases, altura del texto, palabras
y tiempos) están en `src/Reel/config.ts`.

- `public/source.mp4` y `public/subject/*.webp` se generan con `python3 tools/make_subject.py public/TU_VIDEO.MOV`.
- Para exportar: `npx remotion render Reel out/reel.mp4`.
