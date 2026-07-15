# Atlas GeoSales AI

Tablero comercial geoespacial de México con mapa municipal, indicadores de
presupuesto y venta real, y una consola Jarvis para interactuar con la vista.

## Requisitos

- macOS
- Git
- Node.js `22.13.0` o posterior
- npm (incluido con Node.js)

## Instalar en una Mac nueva

```bash
git clone https://github.com/hegaco81/atlas-map.git
cd atlas-map
npm install
npm run dev
```

El servidor local mostrará la dirección que debes abrir en el navegador.

## Flujo para trabajar desde dos equipos

Antes de comenzar en cualquiera de las Macs:

```bash
git pull --rebase origin main
```

Después de hacer cambios:

```bash
git add .
git commit -m "Describe el cambio"
git push origin main
```

En la otra Mac, ejecuta de nuevo `git pull --rebase origin main` para recibirlos.
Evita editar los mismos archivos sin sincronizar primero.

## Comandos útiles

- `npm run dev`: inicia el entorno local de desarrollo.
- `npm test`: compila el proyecto y ejecuta sus pruebas.
- `npm run build`: genera y valida la compilación de producción.
- `npm run lint`: revisa el código con ESLint.

## Estructura principal

- `app/`: interfaz React, mapa y experiencia Jarvis.
- `public/`: archivos públicos y geometría municipal de México.
- `worker/`: servidor de la aplicación y entrega de recursos estáticos.
- `tests/`: pruebas automáticas.
- `.openai/hosting.json`: vínculo con la publicación actual en OpenAI Sites.

## Publicación

La configuración de Sites se conserva dentro del repositorio. No guardes
contraseñas, tokens ni archivos `.env` en Git; ya están excluidos por
`.gitignore`.
