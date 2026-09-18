## Qué cambia

## Cómo se prueba

```bash
npm test
```

## Checklist

- [ ] `npm test` pasa en la raíz (Backend + Frontend).
- [ ] Si agregué o cambié una ruta: `npm run docs:endpoints` y README del módulo actualizados.
- [ ] Si el Frontend usa un endpoint nuevo, existe en `Backend/routes/index.mjs` (lo valida el CI).
- [ ] Permisos nuevos en `Backend/config/permissions.config.mjs` con formato `modulo.accion`.
