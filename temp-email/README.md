# Email Temporal (Temp Mail)

Aplicacion web de emails temporales construida con HTML, CSS y JavaScript vanilla. Usa la API publica de [mail.tm](https://mail.tm) para generar direcciones de email desechables al instante.

## Uso

1. Abre `index.html` directamente en tu navegador (o sirvelo con cualquier servidor estatico).
2. Haz clic en **Generar Email** para crear una direccion temporal.
3. Copia la direccion generada usando el boton de copiar.
4. Usa esa direccion donde necesites recibir un email.
5. Los mensajes recibidos apareceran automaticamente en la bandeja de entrada (se actualiza cada 5 segundos).
6. Haz clic en cualquier mensaje para ver su contenido completo.
7. Puedes generar un nuevo email en cualquier momento con el boton **Nuevo Email**.

## Como funciona

La aplicacion se comunica directamente con la API publica de **mail.tm** desde el navegador:

- `GET /domains` - Obtiene los dominios de email disponibles.
- `POST /accounts` - Crea una cuenta de email temporal.
- `POST /token` - Se autentica y obtiene un token JWT.
- `GET /messages` - Lista los mensajes recibidos.
- `GET /messages/{id}` - Obtiene el contenido completo de un mensaje.

No se necesita ningun backend ni servidor propio. Todo funciona desde el frontend.

## Caracteristicas

- Generacion instantanea de emails temporales.
- Bandeja de entrada con actualizacion automatica cada 5 segundos.
- Visualizacion de emails con soporte para contenido HTML.
- Boton de copiar al portapapeles.
- Diseno oscuro (dark theme) moderno y responsive.
- Interfaz completamente en espanol.

## Nota importante

Los emails generados son **temporales** y se eliminan automaticamente despues de un tiempo. No uses este servicio para cuentas importantes o informacion sensible.
