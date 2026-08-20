# Showroom Hub (nombre provisional)

SaaS de marketing y atención al cliente para dealers de autos usados pequeños de Miami. Repo recién reiniciado — todavía no hay código.

**Lee `PLAN.md` antes de trabajar**: contiene el plan completo (integraciones y sus límites reales, módulos, arquitectura, roadmap por fases).

## Decisiones ya tomadas

- Stack: Next.js (TypeScript) + Supabase (Postgres/RLS/Auth/Storage) + Vercel · n8n para workflows · Resend para email · Claude API para captions bilingües.
- Web app PWA primero (los vendedores la usan del teléfono); nada de app nativa por ahora.
- Estrategia compliance-first (decisión 20 ago 2026): solo Niveles 0 y 1 de automatización — todo lo oficial corre solo; Marketplace es 1 click por auto del vendedor (no hay API oficial para dealers). El Nivel 2 "Turbo" quedó fuera del roadmap. Nunca bots headless, sesiones en la nube, contraseñas de Facebook almacenadas ni técnicas de camuflaje anti-detección.

## Convenciones

- Código, nombres de tablas y comentarios en inglés; documentación de producto en español; UI bilingüe ES/EN.
- Rama de trabajo: `claude/clean-repo-new-project-y4tis1`.
- Demo funcional en el repo (Next.js). Ver `README.md` para arrancarla; `src/lib/store.ts` es la capa de datos que se reemplaza por Supabase.
