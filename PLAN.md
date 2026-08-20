# Showroom Hub — Plan de desarrollo

> Plataforma de marketing y atención al cliente para dealers de autos usados pequeños de Miami.
>
> **Estado:** planificación · **Fecha:** 20 de agosto de 2026 · **Nombre provisional:** Showroom Hub (por decidir)

---

## 1. El producto

**En una frase:** una app donde el dealer mantiene su inventario al día (a mano, por Excel o sincronizado con su web) y la app se encarga de publicarlo todos los días en las plataformas donde compra la gente de Miami — con captions en español e inglés — y de recibir y organizar a los clientes que responden.

**Para quién:** dealers independientes pequeños (10–100 autos en el lote), típicamente con 1–5 vendedores, mercado bilingüe. Primer piloto: The Showroom Corp.

**Las dos patas del producto:**

1. **Marketing** — publicación diaria automática/asistida del inventario en Facebook Marketplace, Facebook Page, Instagram, CarGurus, OfferUp (y más adelante Craigslist, Autotrader, TikTok), respetando los límites de cada plataforma.
2. **Atención al cliente** — bandeja unificada de leads (Messenger, Instagram DM, WhatsApp), respuestas rápidas bilingües, seguimiento de cada cliente hasta la venta.

**Por qué ahora:** el mercado ya está validado — CARVID cobra $249/mes, Shiftly ~$1,000/mes, Glo3D vende paquetes con fotografía 360. Ninguno está construido *bilingüe y para Miami*: captions ES/EN nativos, WhatsApp como canal principal de atención, y precio accesible para el dealer chico.

---

## 2. La realidad de las integraciones (leer primero)

Esta es la parte que decide la arquitectura. No todas las plataformas se pueden automatizar igual, y venderle al dealer "posteo 100% automático a Marketplace" como hacen algunos competidores implica automatizar el navegador con la sesión del vendedor — eso **viola los términos de Meta y arriesga las cuentas**. Nuestra postura es distinta y es un argumento de venta: automatizamos todo lo que se puede automatizar oficialmente, y lo demás lo dejamos *asistido* (1 minuto por publicación, con humano en el loop).

| Plataforma | ¿Publicación automática? | Cómo lo haremos | Notas |
|---|---|---|---|
| **FB Marketplace** | ❌ No existe API. Meta eliminó los listados por catálogo (sept 2021) y por Business Page (ene 2023). Solo cuentas personales, manual. | **Publicación asistida**: la app prepara todo (fotos, caption ES/EN, precio) y arma la cola diaria de cada vendedor; el vendedor confirma cada publicación (extensión de Chrome que pre-llena el formulario, o flujo copiar/pegar desde el teléfono). | Límites por cuenta: empezar con 3–5/día (best practice citada del sector: máx. 10/día), borrar vendidos <24 h, sin duplicados, renovar en vez de reposteear. |
| **FB Page + Instagram** | ✅ Sí — Graph API oficial | Posts orgánicos programados todos los días, totalmente automáticos. | Requiere app de Meta + app review (empezar el trámite temprano, toma semanas). |
| **Messenger + IG DM** | ✅ Sí — API oficial (bandeja) | Webhooks entrantes → bandeja unificada de leads. | Mismo app review de Meta. |
| **WhatsApp Business** | ✅ Sí — Cloud API oficial | Canal principal de atención al cliente. Auto-respuestas y plantillas. | Requiere verificación del negocio en Meta. Plantillas aprobadas para mensajes salientes fuera de la ventana de 24 h. |
| **CarGurus** | 🟡 Por feed de inventario | La app genera un feed (CSV/XML) por dealer, actualizado cada noche; se registra el Feed ID con el account manager de CarGurus. | El dealer necesita su cuenta CarGurus (hay nivel básico y paquetes pagados). Automático una vez configurado. |
| **OfferUp** | 🟡 Por feed (Verified Dealer Program) | Mismo patrón de feed; OfferUp trabaja con partners de inventario (AutoSweet, Hammer Corp, etc.) — investigar registro directo como partner. | Programa pagado del dealer. |
| **FB Automotive Inventory Ads** | ✅ Sí — catálogo + Marketing API | Ads pagados con el catálogo de vehículos (retargeting automático). | Fase posterior; presupuesto de ads del dealer. |
| **Craigslist** | 🟡 Pago por post (~$5), sin API pública | Asistido al inicio; bulk posting solo vía partners aprobados. | Fase posterior. |
| **Autotrader / Cars.com** | 🟡 Por feed vía proveedores certificados | Mismo patrón de feed cuando haya demanda. | Suscripción del dealer. |
| **TikTok / Reels / Shorts** | ✅ APIs oficiales de publicación de video | Videos automáticos por vehículo (foto → video con IA). Diferenciador. | Fase posterior. |

### Estrategia de 3 carriles

- **Carril A — APIs oficiales** (FB Page, IG, WhatsApp, Messenger, AIA, TikTok): automatización total, sin riesgo.
- **Carril B — Feeds de sindicación** (CarGurus, OfferUp, Autotrader): automatización total después de un setup por dealer.
- **Carril C — Publicación asistida** (Marketplace, Craigslist): la app hace el 95% del trabajo; el humano confirma. Cumple la política de "posteo manual" y protege las cuentas de los vendedores.

**Reglas duras del carril C (innegociables):**
- Nunca bots headless ni almacenar contraseñas de Facebook. La sesión vive en el navegador del vendedor.
- Cuentas reales y personales de cada vendedor; jamás cuentas compradas o falsas.
- Un mismo vehículo se publica desde **una sola cuenta a la vez** (la rotación lo reasigna, nunca duplica).
- Cadencia conservadora por cuenta: 3/día cuentas nuevas → hasta 5–8/día cuentas con antigüedad.
- Renovar listados (función nativa de FB cada ~7 días) en vez de borrar y repostear.
- Vendido → recordatorio inmediato de borrarlo de Marketplace (y borrado automático en Page/IG/feeds).

---

## 3. Módulos del producto

### 3.1 Inventario central (fuente de verdad)
- **Alta manual**: formulario con VIN decode automático (API gratuita NHTSA vPIC → año, marca, modelo, trim, motor, transmisión).
- **Import Excel/CSV**: upsert por VIN (o stock #), validación con reporte de errores fila por fila. Spec de columnas abajo.
- **Sync con la web del dealer** (fase 4): scraper o feed según el proveedor del sitio (Dealer Car Search, AutoManager, Carsforsale, etc.).
- **Fotos**: subida múltiple desde el teléfono, orden, portada; compresión automática; watermark opcional del dealer.
- **Estados**: disponible / apartado / vendido / en mecánica · precio, costo (privado), título (clean/rebuilt/salvage — importante en Miami), días en lote.

**Spec import Excel** (columnas): `VIN*` · `Stock#` · `Año/Marca/Modelo/Trim` (auto por VIN, editable) · `Millas*` · `Precio*` · `Color ext/int` · `Título` · `Transmisión/Combustible` (auto por VIN) · `Notas/equipamiento`. Fotos se suben en la app (opcional: columna de URLs). Sin VIN → requiere año/marca/modelo manuales.

### 3.2 Contenido bilingüe (IA)
- Captions ES + EN generados por vehículo y **por plataforma** (Marketplace corto y directo; IG con hashtags; CarGurus descripción larga).
- Plantillas por dealer: tono, emojis, CTA, teléfono, "financiamiento disponible", "bajo down payment", horario.
- Generados con la API de Claude, editables antes de publicar, guardados por vehículo.

Ejemplo (Marketplace ES):
> 🚗 2019 Toyota Camry SE — $16,900
> ✅ 68,000 millas · Título limpio
> ✅ Automático · 4 cilindros · Frío que corta
> 📍 Miami, FL — Financiamiento disponible, bajo down payment
> 📲 Escríbenos hoy — hablamos español

### 3.3 Motor de publicación
- **Calendario y colas**: reglas por plataforma y por cuenta (máx N/día, ventanas horarias "naturales", rotación del inventario priorizando autos recién llegados o con días sin leads).
- **Cola diaria por vendedor** para Marketplace: página móvil "Para publicar hoy" + extensión Chrome en desktop.
- **Publicación directa programada** a FB Page e Instagram (Graph API).
- **Feeds nocturnos** regenerados para CarGurus/OfferUp.
- **Registro de cada post**: plataforma, cuenta, fecha, link — auditable por auto.

### 3.4 Cuentas y equipo
- Multi-tenant: dealer → usuarios con roles (admin, vendedor). RBAC con Supabase RLS (portable con el skill `admin-users-module`).
- Conexiones OAuth del dealer: FB Page, IG Business, WhatsApp.
- Cada vendedor registra sus cuentas de Marketplace (solo metadata para repartir la cola — nunca credenciales).

### 3.5 Atención al cliente (CRM ligero)
- Bandeja unificada: Messenger + IG DM + WhatsApp, con el lead ligado al vehículo cuando es detectable.
- Respuestas rápidas bilingües; auto-respuesta fuera de horario; opcional IA que contesta preguntas del inventario (precio, millas, down) y escala al vendedor.
- Pipeline simple: nuevo → contactado → cita → vendido/perdido, con recordatorios de seguimiento.

### 3.6 Analítica
- Posts por plataforma/cuenta/día · leads por fuente · autos con más interés · días-en-lote · funnel de ventas.

---

## 4. Arquitectura técnica

| Capa | Elección | Por qué |
|---|---|---|
| Web app | **Next.js (TypeScript) en Vercel**, PWA responsive | Los vendedores la usan del teléfono; PWA primero, app nativa solo si hace falta. |
| Base de datos / Auth / Storage | **Supabase** (Postgres + RLS multi-tenant, Auth, Storage para fotos, Edge Functions, pg_cron) | Todo integrado, RLS resuelve el multi-tenant con seguridad real. |
| Workflows / jobs | **n8n** (publicación programada, regeneración de feeds, webhooks de Meta/WhatsApp, recordatorios) | Acelera el MVP; alternativa: Edge Functions + pg_cron. |
| Extensión Chrome | Manifest V3 — lee la cola del día y pre-llena el formulario de Marketplace; el vendedor confirma | El carril C en desktop. |
| Email | **Resend** (invitaciones, resumen diario al dealer) | |
| IA | **Claude API** — `claude-opus-5` por defecto para captions y auto-respuestas (opción económica: Haiku 4.5, a decidir según volumen/calidad) | SDK TypeScript. |
| VIN decode | **NHTSA vPIC** (gratis) | |

### Modelo de datos (tablas core)

- `dealers`, `users` (roles), `platform_connections` (tokens OAuth por dealer), `seller_accounts` (metadata de cuentas Marketplace por vendedor)
- `vehicles` (vin, stock#, año, marca, modelo, trim, millas, precio, costo, título, estado, features jsonb), `vehicle_photos`
- `captions` (vehicle_id, plataforma, idioma, texto, generado/editado)
- `post_queue` (vehicle_id, cuenta, plataforma, scheduled_at, estado), `posts` (publicados: link, timestamps)
- `leads`, `conversations`, `messages`, `followups`
- `imports` (jobs de Excel con errores), `feeds` (config por plataforma/dealer)

### Costos de operación estimados (arranque)

Vercel ~$0–20/mes · Supabase ~$25/mes · n8n self-host o cloud ~$24/mes · Claude API ~$5–30/mes (captions son baratos) · Resend gratis al inicio · APIs de Meta gratis (WhatsApp cobra por plantilla enviada, centavos) · **Del lado del dealer**: cuenta CarGurus, programa OfferUp, ~$5/post en Craigslist, presupuesto de ads si activa AIA.

---

## 5. Cumplimiento y riesgos

| Riesgo | Mitigación |
|---|---|
| Meta restringe cuentas de vendedores por spam en Marketplace | Carril C asistido (humano confirma), límites conservadores, fotos reales, renovar en vez de duplicar, borrar vendidos <24 h. |
| App review de Meta demora (Pages/IG/Messenger/WhatsApp) | Empezarlo en Fase 2 temprano; mientras, el modo dev funciona con las cuentas del propio negocio. |
| Datos de clientes | Buenas prácticas de privacidad, consentimiento y opt-out. Si se agrega SMS: **TCPA exige consentimiento previo** — no lanzar SMS sin revisarlo. |
| Publicidad engañosa | Precios veraces, disclaimers de financiamiento del dealer. |
| Dependencia de plataformas | El inventario central es nuestro; las plataformas son canales intercambiables. |

---

## 6. Roadmap

Estimaciones para 1 dev full-time trabajando con Claude Code.

### Fase 0 — Fundación (~1 semana)
Esqueleto Next.js + Supabase + Vercel · auth multi-tenant + RBAC (skill `admin-users-module`) · CI básico.

### Fase 1 — MVP: Inventario + Contenido (~2–3 semanas)
CRUD de vehículos con VIN decode · fotos · import Excel · captions IA ES/EN por plataforma · **cola diaria manual**: página móvil "Para publicar hoy" por vendedor con botón de copiar caption y galería de fotos. ➡️ *El MVP ya da valor real sin ninguna integración: convierte 20 minutos por publicación en 1.*

### Fase 2 — Automatización (~3–4 semanas)
Extensión Chrome para Marketplace · publicación automática FB Page + IG (Graph API; app review en paralelo) · feed CarGurus por dealer · recordatorios de renovar/borrar vendidos.

### Fase 3 — Atención al cliente (~3–4 semanas)
Bandeja Messenger/IG/WhatsApp · respuestas rápidas bilingües · auto-respuesta IA · pipeline de leads + seguimientos.

### Fase 4 — Escala (continuo)
Feed OfferUp · Craigslist · Automotive Inventory Ads · sync con la web del dealer · analítica completa · billing multi-dealer (Stripe) · videos IA para Reels/TikTok.

**Total a v1 completa: ~10–12 semanas.**

---

## 7. Modelo de negocio (borrador)

Referencias del mercado: CARVID $249/mes · Shiftly ~$1,000/mes · Glo3D (paquetes con foto 360).

| Tier | Precio idea | Incluye |
|---|---|---|
| Starter | ~$99/mes | Inventario + captions IA + cola asistida, 2 vendedores |
| Pro | ~$199–249/mes | + Extensión, FB Page/IG automático, feed CarGurus, 5 vendedores |
| Premium | ~$399/mes | + WhatsApp inbox, IA de respuestas, ads, vendedores ilimitados |

**Ventaja competitiva:** bilingüe nativo + WhatsApp + precio para el dealer chico. **Piloto:** 2–3 dealers de Miami gratis 60 días (The Showroom Corp primero).

---

## 8. Decisiones abiertas

1. **Nombre del producto** (Showroom Hub es provisional).
2. ¿PWA es suficiente o quieren app en las tiendas? (recomendación: PWA primero).
3. ¿Qué proveedores de web/DMS usan los dealers objetivo? (define la prioridad del sync de Fase 4).
4. ¿Quién es el primer dealer piloto y qué cuentas de plataformas ya tiene?
5. Idioma de la UI: ¿bilingüe con switch, o español primero?

## 9. Próximos pasos inmediatos

1. Validar este plan con 2–3 dealers reales (se pueden generar mockups de las pantallas clave para enseñar).
2. Aprobar stack y alcance de Fase 1.
3. Crear el proyecto de Supabase y el esqueleto Next.js en este repo (Fase 0).
4. Crear la app de Meta y arrancar el trámite de app review cuanto antes.

---

## Fuentes

- [Meta discontinuó los listados de vehículos por catálogo en Marketplace (2021)](https://www.dealersunited.com/blog/facebook-marketplace-automation-discontinued/) · [y por Business Pages (2023)](https://www.clickheredigital.com/insights/is-facebook-discontinuing-marketplace-vehicle-listings)
- [Guía 2026: cómo publican los dealers en Marketplace hoy (cuentas personales, límites)](https://www.carvidapp.com/can-car-dealers-post-on-facebook-marketplace/)
- [CarGurus se alimenta por feed de un proveedor de inventario](https://dealercenter.cargurus.com/product-info/why-an-inventory-feed-provider-is-the-key-to-advertising-on-cargurus/) · [ejemplo de setup de feed](https://help.motordesk.com/docs/faq/cargurus-feed/)
- [OfferUp Verified Dealer Program (feeds vía partners)](https://blog.offerup.com/offerup-expands-verified-dealer-program-to-include-dealer-inventory-and)
- [Panorama de herramientas competidoras y precios (CARVID, Shiftly, Glo3D)](https://www.carvidapp.com/best-facebook-marketplace-tools/)
