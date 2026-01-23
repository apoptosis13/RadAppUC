---
description: Configurar respaldos automáticos en Google Cloud para Firestore
---

# Estrategia de Respaldo en la Nube (Google Cloud Platform)

Este workflow describe cómo configurar copias de seguridad automáticas diarias de Firestore importándolas a un Bucket de Google Cloud Storage (GCS) y programándolas con Cloud Scheduler.

## Paso 1: Configurar el Bucket de Almacenamiento

1.  Ve a la [Consola de Google Cloud](https://console.cloud.google.com/).
2.  Asegúrate de estar en el proyecto correcto (mismo ID que tu proyecto Firebase).
3.  Navega a **Cloud Storage** > **Buckets**.
4.  Haz clic en **CREAR**.
5.  Nombra el bucket (ej: `voxelhub-backups`).
6.  Selecciona una región (idealmente la misma que tu base de datos Firestore, ej: `us-central1`).
7.  En clase de almacenamiento, selecciona **Standard**.
8.  Haz clic en **CREAR**.

## Paso 2: Configurar Permisos IAM

Para que el servicio de exportación de Firestore pueda escribir en el Bucket:

1.  Ve a `https://console.cloud.google.com/iam-admin/iam`.
2.  Busca la cuenta de servicio por defecto de Google Cloud (generalmente termina en `@appspot.gserviceaccount.com`).
3.  Edita sus permisos (Icono de lápiz).
4.  Asegúrate de que tenga el rol **Administrador de almacenamiento (Storage Admin)** o **Escritor de objetos de almacenamiento**.

## Paso 3: Crear el Trabajo Programado (Cloud Scheduler)

1.  Ve a **Cloud Scheduler** en la consola.
2.  Haz clic en **CREAR TRABAJO**.
3.  **Configuración**:
    *   **Nombre**: `firestore-daily-backup`
    *   **Región**: `us-central1`
    *   **Frecuencia**: `0 3 * * *` (Esto es a las 3:00 AM todos los días. Usa formato cron).
    *   **Zona horaria**: Selecciona tu zona horaria local (ej: `Chile/Continental`).
4.  **Destino**:
    *   **Tipo de destino**: `HTTP`
    *   **URL**: `https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default):exportDocuments`
        *   (Reemplaza `YOUR_PROJECT_ID` con el ID de tu proyecto, ej: `voxelhub-123`).
    *   **Método**: `POST`
    *   **Cuerpo (Body)**:
        ```json
        {
          "outputUriPrefix": "gs://voxelhub-backups/daily-backup"
        }
        ```
    *   **Auth Header**: Selecciona `Add OAuth token`.
    *   **Cuenta de servicio**: Selecciona la "App Engine default service account".
5.  Haz clic en **CREAR**.

## Paso 4: Verificación

1.  En la lista de trabajos de Cloud Scheduler, haz clic en **EJECUTAR AHORA** (Run Now) en tu nuevo trabajo.
2.  Espera unos segundos y verifica que el resultado sea "Éxito" (Success).
3.  Ve a tu Bucket en Cloud Storage y verifica que se haya creado la carpeta con los datos exportados.

---

> [!TIP]
> **Restauración**: Para restaurar estos datos, puedes usar el comando `gcloud firestore import gs://voxelhub-backups/daily-backup/CARPETA_TIMESTAMP`.
