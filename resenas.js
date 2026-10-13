/* =========================================
   PÁGINA DE RESEÑAS
   Usa los datos y funciones de compartido.js
   ========================================= */

const formResena = document.getElementById("form-resena");
const resInputFoto = document.getElementById("res-foto");
const resVistaFoto = document.getElementById("res-vista-foto");
const resVistaFotoImg = document.getElementById("res-vista-foto-img");
const avisoResena = document.getElementById("aviso-resena");

function resQuitarFoto() {
    if (resVistaFotoImg.src) {
        URL.revokeObjectURL(resVistaFotoImg.src);
    }
    resVistaFotoImg.removeAttribute("src");
    resInputFoto.value = "";
    resVistaFoto.hidden = true;
}

resInputFoto.addEventListener("change", () => {
    const archivo = resInputFoto.files[0];

    if (!archivo) {
        resQuitarFoto();
        return;
    }

    if (!archivo.type.startsWith("image/")) {
        alert("Por favor elige un archivo de imagen.");
        resQuitarFoto();
        return;
    }

    if (archivo.size > TAMANO_MAXIMO_FOTO) {
        alert("La foto es muy pesada (máximo 8 MB). Elige una más pequeña.");
        resQuitarFoto();
        return;
    }

    if (resVistaFotoImg.src) {
        URL.revokeObjectURL(resVistaFotoImg.src);
    }
    resVistaFotoImg.src = URL.createObjectURL(archivo);
    resVistaFoto.hidden = false;
});

document.getElementById("res-btn-quitar-foto").addEventListener("click", resQuitarFoto);

formResena.addEventListener("submit", async evento => {
    evento.preventDefault();

    const nombre = document.getElementById("res-nombre").value.trim();
    const producto = document.getElementById("res-producto").value.trim();
    const estrellas = Number(document.getElementById("res-estrellas").value);
    const comentario = document.getElementById("res-comentario").value.trim();
    const archivo = resInputFoto.files[0];
    const boton = formResena.querySelector('button[type="submit"]');
    const ventana = window.open("about:blank", "_blank");

    const foto = await prepararFoto(archivo, boton);

    let mensaje = "Hola, quiero dejar mi reseña:\n\n";
    mensaje += `Nombre: ${nombre}`;
    if (producto) mensaje += `\nProducto: ${producto}`;
    mensaje += `\nCalificación: ${"★".repeat(estrellas)}${"☆".repeat(5 - estrellas)} (${estrellas}/5)`;
    mensaje += `\nComentario: ${comentario}`;

    if (foto.enlace) {
        mensaje += `\n\nMi foto: ${foto.enlace}`;
    } else if (archivo) {
        mensaje += "\n\nTe envío mi foto en este chat.";
    }
    mensaje += "\n\nAutorizo que mi reseña se publique en el sitio.";

    abrirWhatsApp(ventana, mensaje);

    if (archivo && !foto.enlace) {
        avisoResena.textContent = foto.fallo
            ? "No pudimos subir la foto automáticamente. Se abrió WhatsApp con tu reseña; adjunta tu foto en el chat con el clip 📎 antes de enviar. ¡Gracias!"
            : "Se abrió WhatsApp con tu reseña. Recuerda adjuntar tu foto en el chat con el clip 📎 antes de enviar. ¡Gracias!";
    } else {
        avisoResena.textContent = "Se abrió WhatsApp con tu reseña. Presiona enviar. ¡Gracias por tu opinión!";
    }
    avisoResena.hidden = false;

    // Limpia las cajas
    formResena.reset();
    resQuitarFoto();
});

// Si la subida automática está activa, cambia el aviso de la foto
if (subidaDeFotosActiva()) {
    document.querySelectorAll(".nota-foto").forEach(nota => {
        nota.textContent = "Tu foto se sube automáticamente y su enlace va dentro del mensaje de WhatsApp.";
    });
}

document.getElementById("anio").textContent = new Date().getFullYear();
