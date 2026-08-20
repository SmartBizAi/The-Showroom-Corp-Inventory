# Showroom Hub — demo

Demo funcional de la plataforma de marketing e inventario para dealers de autos usados de Miami.
No es un mockup: el inventario, los anuncios bilingües, la cola diaria de publicación y la bandeja
de clientes funcionan de verdad.

El plan completo del producto está en [`PLAN.md`](./PLAN.md).

## Arrancar en 2 minutos

```bash
npm install
npm run dev          # http://localhost:3000
```

No hace falta configurar nada: la demo arranca con un dealer de ejemplo (The Showroom Corp),
8 autos, 3 vendedores y 4 clientes esperando respuesta. Los datos se guardan en `data/db.json`
(se crea solo la primera vez; bórralo y la demo se reconstruye).

## Probar con tus cuentas y luego pasarla a un cliente

Esta es la razón de ser de la demo, y está pensada para hacerse sin tocar código.

**1. Prueba con lo tuyo.** Ve a **Conexiones** y pon los nombres de tus cuentas reales (tu página
de Facebook, tu Instagram, tu WhatsApp). Sube tu inventario real desde **Inventario → Importar
Excel**. Ya tienes la demo con tus datos.

**2. Pásala al cliente.** En **Ajustes → Nuevo workspace de dealer** creas el espacio del cliente
con su nombre, ciudad y teléfono. Se activa al instante, vacío y con sus propias cuentas. El tuyo
queda intacto: cambias entre los dos con el selector de arriba a la izquierda.

Cada workspace tiene su inventario, sus cuentas, sus vendedores y sus clientes, completamente
separados. Es el mismo modelo multi-dealer que llevará la versión de producción.

## Qué funciona de verdad

| Función | Estado |
|---|---|
| Inventario (alta, edición, estados, precio) | Real |
| Lectura de VIN → año, marca, modelo, motor | Real — API pública de NHTSA, sin clave |
| Importar Excel/CSV con reporte de errores por fila | Real — acepta columnas en inglés o español |
| Anuncios en español e inglés por canal | Real — plantillas, o IA con `ANTHROPIC_API_KEY` |
| Cola diaria repartida entre canales y vendedores | Real — con límites por cuenta |
| Bandeja de clientes con respuestas rápidas bilingües | Real (las respuestas no salen a las plataformas) |
| Publicar hacia Facebook / Instagram / feeds | Simulado hasta configurar credenciales |

**Modo demo.** Sin credenciales configuradas, las publicaciones se registran en la app pero no
salen a las plataformas reales. La app lo dice claramente en todo momento — nunca finge haber
publicado algo que no publicó.

## Activar la IA para los anuncios

Sin clave, los anuncios se escriben con plantillas y quedan presentables. Con clave, los escribe
Claude y se adaptan al tono del dealer y al formato de cada canal.

```bash
cp .env.example .env.local
# descomenta y rellena ANTHROPIC_API_KEY
```

Un detalle: la plantilla no traduce el equipamiento que venga escrito en español en tu Excel
("Techo solar" se queda igual en la versión en inglés). Con la clave de Claude sí se traduce.

## Publicar de verdad

Cada canal necesita sus credenciales en `.env.local` — están todas listadas en `.env.example`.
Facebook Page, Instagram y WhatsApp requieren una app de Meta con app review, que tarda semanas:
conviene empezar el trámite temprano.

Facebook Marketplace **no lleva credenciales a propósito**. No existe API oficial para dealers, así
que la app prepara el anuncio completo y el vendedor pulsa Publicar desde su propia cuenta. Es la
única forma que Facebook permite, y mantiene las cuentas de los vendedores protegidas. Ver
"Niveles de automatización" en `PLAN.md`.

## Estructura

```
src/
  app/                 Pantallas (Resumen, Publicar hoy, Inventario, Clientes, Conexiones, Ajustes)
  app/api/             Endpoints
  components/          Componentes de interfaz
  lib/
    store.ts           Capa de datos — se reemplaza por Supabase sin tocar nada más
    queue.ts           Motor de publicación: qué se publica hoy, en qué canal, desde qué cuenta
    captions.ts        Anuncios bilingües (Claude API con fallback a plantillas)
    vin.ts             Lectura de VIN contra NHTSA
data/db.json           Los datos de la demo
```

## Comandos

```bash
npm run dev        # desarrollo
npm run build      # compilar
npm run start      # servir la versión compilada
npm run typecheck  # revisar tipos
```
