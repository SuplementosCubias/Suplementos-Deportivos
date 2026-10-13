/* =========================================
   PÁGINA: CONSULTAR UN PRODUCTO
   Usa los datos y funciones de compartido.js
   ========================================= */

const formConsulta = document.getElementById("form-consulta");
const inputFoto = document.getElementById("pers-foto");
const vistaFoto = document.getElementById("vista-foto");
const vistaFotoImg = document.getElementById("vista-foto-img");
const avisoConsulta = document.getElementById("aviso-consulta");

// Si el cliente venía del buscador, el producto que escribió ya aparece escrito
const productoBuscado = new URLSearchParams(window.location.search).get("producto");
if (productoBuscado) {
    document.getElementById("pers-producto").value = productoBuscado.slice(0, 120);
}

function quitarFoto() {
    if (vistaFotoImg.src) {
        URL.revokeObjectURL(vistaFotoImg.src);
    }
    vistaFotoImg.removeAttribute("src");
    inputFoto.value = "";
    vistaFoto.hidden = true;
}

inputFoto.addEventListener("change", () => {
    const archivo = inputFoto.files[0];

    if (!archivo) {
        quitarFoto();
        return;
    }

    if (!archivo.type.startsWith("image/")) {
        alert("Por favor elige un archivo de imagen.");
        quitarFoto();
        return;
    }

    if (archivo.size > TAMANO_MAXIMO_FOTO) {
        alert("La foto es muy pesada (máximo 8 MB). Elige una más pequeña.");
        quitarFoto();
        return;
    }

    if (vistaFotoImg.src) {
        URL.revokeObjectURL(vistaFotoImg.src);
    }
    vistaFotoImg.src = URL.createObjectURL(archivo);
    vistaFoto.hidden = false;
});

document.getElementById("btn-quitar-foto").addEventListener("click", quitarFoto);

formConsulta.addEventListener("submit", async evento => {
    evento.preventDefault();

    const producto = document.getElementById("pers-producto").value.trim();
    const marca = document.getElementById("pers-marca").value.trim();
    const cantidad = document.getElementById("pers-cantidad").value || "1";
    const enlace = document.getElementById("pers-enlace").value.trim();
    const detalles = document.getElementById("pers-detalles").value.trim();
    const nombre = document.getElementById("pers-nombre").value.trim();
    const zona = document.getElementById("pers-zona").value.trim();
    const archivo = inputFoto.files[0];
    const boton = formConsulta.querySelector('button[type="submit"]');
    const ventana = window.open("about:blank", "_blank");

    const foto = await prepararFoto(archivo, boton);

    let mensaje = "Hola, quiero consultar por un producto que no está en el catálogo:\n\n";
    mensaje += `Producto: ${producto}`;
    if (marca) mensaje += `\nMarca/presentación: ${marca}`;
    mensaje += `\nCantidad: ${cantidad}`;
    if (enlace) mensaje += `\nEnlace: ${enlace}`;
    if (detalles) mensaje += `\nDetalles: ${detalles}`;

    if (foto.enlace) {
        mensaje += `\n\nFoto del producto: ${foto.enlace}`;
    } else if (archivo) {
        mensaje += "\n\nTengo una foto del producto, te la envío en este chat.";
    }
    mensaje += `\n\nNombre: ${nombre}`;
    mensaje += `\nZona de entrega: ${zona}`;

    abrirWhatsApp(ventana, mensaje);

    if (archivo && !foto.enlace) {
        avisoConsulta.textContent = foto.fallo
            ? "No pudimos subir la foto automáticamente. Se abrió WhatsApp con tu consulta; adjunta tu foto en el chat con el clip 📎 antes de enviar."
            : "Se abrió WhatsApp con tu consulta. Recuerda adjuntar tu foto en el chat con el clip 📎 antes de enviar.";
    } else {
        avisoConsulta.textContent = "Se abrió WhatsApp con tu consulta. Presiona enviar y te responderemos pronto.";
    }
    avisoConsulta.hidden = false;

    // Limpia las cajas para una nueva consulta
    formConsulta.reset();
    quitarFoto();
});

// Si la subida automática está activa, cambia el aviso de la foto
if (subidaDeFotosActiva()) {
    document.querySelectorAll(".nota-foto").forEach(nota => {
        nota.textContent = "Tu foto se sube automáticamente y su enlace va dentro del mensaje de WhatsApp.";
    });
}

document.getElementById("anio").textContent = new Date().getFullYear();
