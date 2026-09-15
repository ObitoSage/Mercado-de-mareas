# Investigación y fuentes

## Playwright local y en CI

El proyecto usa un solo conjunto E2E contra dos destinos. Sin `BASE_URL`, Playwright construye e inicia Express localmente. Con `BASE_URL`, usa el despliegue y no levanta servidor local. `npm run e2e` ejecuta Chromium headless y `npm run e2e:headed` usa el canal de Google Chrome con ventana visible.

La documentación oficial recomienda `npm ci`, instalar navegador y dependencias con la CLI y ejecutar `playwright test` en CI. También recomienda un worker en CI para estabilidad. La configuración del proyecto aplica `workers: 1` cuando existe `CI` y conserva reporte HTML: [Playwright, Continuous Integration](https://playwright.dev/docs/ci).

El canal `chrome` permite comprobar el navegador instalado durante la defensa, mientras `chromium` ofrece el binario reproducible de CI: [Playwright, Browsers](https://playwright.dev/docs/browsers).

Los recorridos no interceptan la API. Esperan respuestas `POST`, estados de carga y elementos accesibles. Cubren inicio, movimiento/carga/venta, rechazo `409` sin mutación y resultado después de diez rondas.

## GitHub Actions

GitHub recomienda instalar la versión de Node con `setup-node`, restaurar dependencias con `npm ci` y ejecutar los scripts del repositorio: [GitHub Docs, Building and testing Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs).

Se separaron tres workflows para que cada responsabilidad sea visible:

- `lint.yml`: ESLint y TypeScript.
- `e2e.yml`: pruebas unitarias/integración, Chromium y reporte Playwright.
- `deploy.yml`: gate completo, deploy hook, espera del SHA y smoke publicado.

Todos usan Node 24 y el lockfile. El despliegue se activa solo después de repetir lint, tipos, pruebas, build y E2E.

## Render Web Service

Render ejecuta un único Web Service Node. El Blueprint declara `npm ci && npm run build`, `npm start`, plan gratuito, `NODE_VERSION=24`, `/api/health` y despliegue automático desactivado. La guía oficial de Express confirma el modelo de build/start para un servicio Node: [Render, Deploy a Node Express App](https://render.com/docs/deploy-node-express-app).

La estructura de `render.yaml`, `healthCheckPath`, `envVars` y `autoDeployTrigger` procede de la [referencia oficial de Blueprint](https://render.com/docs/blueprint-spec).

Express escucha `process.env.PORT`, variable que Render asigna al servicio. Render también expone `RENDER_GIT_COMMIT`, usado por health para publicar el commit ejecutado: [Render, Default Environment Variables](https://render.com/docs/environment-variables).

## Deploy hook y verificación del SHA

El workflow guarda la URL privada en `RENDER_DEPLOY_HOOK_URL` y añade `&ref=${GITHUB_SHA}` para solicitar exactamente el commit aprobado por el gate. Render documenta el parámetro `ref` para desplegar un commit o rama mediante hook: [Render, Deploy Hooks](https://render.com/docs/deploy-hooks).

Después del hook, Actions consulta `PUBLIC_APP_URL/api/health` hasta que la respuesta contiene el mismo SHA. Solo entonces ejecuta un recorrido E2E publicado. Render utiliza respuestas `2xx`/`3xx` del endpoint para decidir salud y retira instancias no saludables: [Render, Health Checks](https://render.com/docs/health-checks).

## Variables y secretos

| Nombre | Lugar | Función |
| --- | --- | --- |
| `PORT` | Entorno local/Render | Puerto HTTP; Express usa 3000 como valor local. |
| `RENDER_GIT_COMMIT` | Render | SHA incluido en `/api/health`. |
| `BASE_URL` | Máquina/CI | Destino opcional para Playwright. |
| `RENDER_DEPLOY_HOOK_URL` | GitHub Actions secret | Activa el despliegue; su valor es privado. |
| `PUBLIC_APP_URL` | GitHub Actions secret | URL pública usada para health y smoke. |

## Limitaciones observadas

- El plan gratuito puede dormir el servicio. La primera solicitud y el deployment pueden tardar por arranque en frío.
- El estado vive en memoria y se elimina con un reinicio o despliegue.
- El cierre del servidor Playwright puede quedar esperando dentro de un sandbox restringido de Windows; fuera de ese sandbox, el mismo comando termina con código 0. CI y la defensa ejecutan en entornos normales.
- Chrome debe estar instalado para el proyecto `chrome`; Chromium se instala mediante Playwright.
- El deploy hook es una credencial. No debe aparecer en logs, documentos ni commits.

## Evidencia del primer despliegue

El 15 de septiembre de 2026 los workflows [Lint](https://github.com/ObitoSage/Mercado-de-mareas/actions/runs/34939917524), [Tests and E2E](https://github.com/ObitoSage/Mercado-de-mareas/actions/runs/34939917554) y [Deploy](https://github.com/ObitoSage/Mercado-de-mareas/actions/runs/34939917531) finalizaron correctamente para `9862a1baa59fe967e9e11f999b48ea302c3d194a`. El endpoint <https://mercado-de-mareas.onrender.com/api/health> devolvió ese mismo SHA y los cuatro E2E visibles aprobaron contra la URL pública.

