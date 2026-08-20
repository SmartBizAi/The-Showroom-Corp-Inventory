# Showroom Hub (nombre provisional)

SaaS de marketing y atención al cliente para dealers de autos usados pequeños de Miami. Repo recién reiniciado — todavía no hay código.

**Lee `PLAN.md` antes de trabajar**: contiene el plan completo (integraciones y sus límites reales, módulos, arquitectura, roadmap por fases).

## Decisiones ya tomadas

- Stack: Next.js (TypeScript) + Supabase (Postgres/RLS/Auth/Storage) + Vercel · n8n para workflows · Resend para email · Claude API para captions bilingües.
- Web app PWA primero (los vendedores la usan del teléfono); nada de app nativa por ahora.
- Facebook Marketplace NO tiene API oficial para dealers: publicación asistida por niveles — 1 click por auto o 1 click por día (ver "Niveles de automatización" en PLAN.md). Nunca bots headless, sesiones en la nube, contraseñas de Facebook almacenadas ni técnicas de camuflaje anti-detección.

## Convenciones

- Código, nombres de tablas y comentarios en inglés; documentación de producto en español; UI bilingüe ES/EN.
- Rama de trabajo: `claude/clean-repo-new-project-y4tis1`.
