// ==========================================
// HELPER UNIVERSAL DE CACHÉ (Stale-While-Revalidate)
// ==========================================
async function cargarConCache(cacheKey, fetchFunction, renderFunction) {
    // 1. Mostrar datos guardados en localStorage al INSTANTE
    const datosGuardados = localStorage.getItem(cacheKey);
    if (datosGuardados) {
        try {
            const parsedData = JSON.parse(datosGuardados);
            renderFunction(parsedData, true); // true indica que viene del caché
        } catch (e) {
            console.error("Error al parsear el caché:", e);
        }
    }

    // 2. Buscar datos frescos en Supabase en segundo plano
    try {
        const freshData = await fetchFunction();
        if (freshData !== null && freshData !== undefined) {
            localStorage.setItem(cacheKey, JSON.stringify(freshData));
            renderFunction(freshData, false); // false indica que son datos frescos de la BD
        }
    } catch (err) {
        console.error(`Error actualizando segundo plano [${cacheKey}]:`, err);
    }
}