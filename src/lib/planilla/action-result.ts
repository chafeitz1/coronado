/** Resultado de una lectura que no lanza: en producción Next oculta el
 *  mensaje de un error lanzado por una server action, así que las lecturas
 *  de pantalla devuelven el error como dato para poder mostrarlo. */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
