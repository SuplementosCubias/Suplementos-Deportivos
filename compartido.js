/* =========================================
   DATOS COMPARTIDOS (edita aquí)
   Lo usan la tienda (index.html) y la página de reseñas (resenas.html)
   ========================================= */

const telefono = "50376600656";

// Subida automática de fotos para las reseñas (opcional).
// Si dejas estos dos valores vacíos, el cliente debe adjuntar la foto a mano en WhatsApp.
// Si los llenas, la foto se sube sola y el enlace va dentro del mensaje.
const cloudinaryCloudName = "";    // Ej: "dxxxxxxxx"
const cloudinaryUploadPreset = ""; // Ej: "proevidence_fotos"

const TAMANO_MAXIMO_FOTO = 8 * 1024 * 1024; // 8 MB

/* =========================================
   RESEÑAS PUBLICADAS
   ========================================= */

// Agrega aquí SOLO reseñas reales y con permiso del cliente.
// Para cada una, sube la foto al repositorio y escribe su nombre de archivo en "foto".
// Si no hay foto, deja foto: "".
//
// Ejemplo de cómo agregar una (cópialo dentro de los corchetes con datos reales):
//
// {
//     nombre: "Nombre del cliente",
//     producto: "Creatina ON",
//     estrellas: 5,
//     comentario: "Texto de la reseña.",
//     foto: "resena1.jpg"
// },
const resenas = [
];

/* =========================================
   UTILIDADES
   ========================================= */

function escapar(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

function renderResenas() {
    const lista = document.getElementById("lista-resenas");
    const sinResenas = document.getElementById("sin-resenas");

    if (!lista) return;

    lista.innerHTML = resenas.map(r => {
        const estrellas = Math.min(5, Math.max(1, Number(r.estrellas) || 5));
        const foto = r.foto
            ? `<img src="${escapar(r.foto)}" alt="Foto de ${escapar(r.nombre)}" loading="lazy">`
            : "";

        return `
            <article class="resena">
                ${foto}
                <div class="resena-estrellas" aria-label="${estrellas} de 5 estrellas">
                    ${"★".repeat(estrellas)}${"☆".repeat(5 - estrellas)}
                </div>
                <p class="resena-texto">${escapar(r.comentario)}</p>
                <p class="resena-autor">
                    — ${escapar(r.nombre)}${r.producto ? ` · ${escapar(r.producto)}` : ""}
                </p>
            </article>
        `;
    }).join("");

    if (sinResenas) {
        sinResenas.hidden = resenas.length > 0;
    }
}

/* =========================================
   SUBIDA DE FOTOS Y WHATSAPP
   ========================================= */

function subidaDeFotosActiva() {
    return Boolean(cloudinaryCloudName && cloudinaryUploadPreset);
}

// Reduce la foto para que suba rápido con datos móviles
function comprimirImagen(archivo, ladoMaximo = 1600, calidad = 0.85) {
    return new Promise(resolve => {
        const url = URL.createObjectURL(archivo);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * escala);
            canvas.height = Math.round(img.height * escala);
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => resolve(blob || archivo), "image/jpeg", calidad);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(archivo);
        };

        img.src = url;
    });
}

async function subirFoto(archivo) {
    const imagen = await comprimirImagen(archivo);
    const datos = new FormData();
    datos.append("file", imagen);
    datos.append("upload_preset", cloudinaryUploadPreset);

    const respuesta = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
        { method: "POST", body: datos }
    );

    if (!respuesta.ok) {
        throw new Error("No se pudo subir la foto");
    }

    const resultado = await respuesta.json();
    return resultado.secure_url;
}

// Devuelve { enlace, fallo }. Si no hay foto o la subida no está activa, no hace nada.
async function prepararFoto(archivo, boton) {
    if (!archivo || !subidaDeFotosActiva()) {
        return { enlace: "", fallo: false };
    }

    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Subiendo foto...";

    try {
        return { enlace: await subirFoto(archivo), fallo: false };
    } catch (error) {
        return { enlace: "", fallo: true };
    } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
}

// La ventana se abre antes de subir la foto para que el navegador no la bloquee
function abrirWhatsApp(ventana, mensaje) {
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

    if (ventana && !ventana.closed) {
        ventana.location.href = url;
    } else {
        window.location.href = url;
    }
}
