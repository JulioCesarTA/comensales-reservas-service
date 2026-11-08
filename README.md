# comensales-reservas-service

Estudiantes, becas, turnos, reservas, lista de espera y control de ingreso con QR.

| | |
|---|---|
| Stack | TypeScript · NestJS |
| Arquitectura de código | Clean Architecture |
| Base de datos | PostgreSQL (propia) |
| Nube de despliegue | Azure (AKS) |
| Puerto local | `8082` (dentro del contenedor, `8080`) |

La reserva es el paso 1 y el 4 de la saga (queda `pendiente` y luego se confirma).

## Probar

```bash
npm test
docker build -t comensales-reservas-service .
```

## Ejecutar con todo el sistema

Este repositorio es solo un microservicio. Para levantar el sistema completo (bases de datos, Keycloak, gateways, frontends) usa
[`comedor-infra`](https://github.com/JulioCesarTA/comedor-infra) con los demás repositorios clonados en la misma carpeta:

```bash
git clone https://github.com/JulioCesarTA/comedor-infra && cd comedor-infra && bash clonar-todo.sh
docker compose up -d --build
```

## CI/CD

- `.github/workflows/ci.yml`: pruebas y construcción de la imagen en cada push y pull request.
- `.github/workflows/cd.yml`: construye y sube la imagen al registro de Azure y aplica el manifiesto de
  `comedor-infra/infra/k8s/azure/comensales-reservas-service/`. Secretos necesarios: ver el propio archivo.
