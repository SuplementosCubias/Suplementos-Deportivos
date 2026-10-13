/* =========================================
   CONFIGURACIÓN (edita aquí tus datos)
   ========================================= */

const telefono = "50376600656";

// Formas de pago que aparecen en el pedido.
// Cámbialas por las que realmente aceptas.
const formasDePago = [
    "Lo coordino por WhatsApp",
    "Transferencia bancaria",
    "Efectivo contra entrega"
];

// Subida automática de fotos (opcional).
// Si dejas estos dos valores vacíos, el cliente debe adjuntar la foto a mano en WhatsApp.
// Si los llenas, la foto se sube sola y el enlace va dentro del mensaje.
const cloudinaryCloudName = "";    // Ej: "dxxxxxxxx"
const cloudinaryUploadPreset = ""; // Ej: "proevidence_fotos"

const productos = [
    {
        id: 1,
        nombre: "Creatina Planitum - 80 Servicios",
        precio: 40,
        imagen: "001.jpg",
        descripcion: "Creatina monohidratada para apoyar fuerza y rendimiento en el entrenamiento."
    },
    {
        id: 2,
        nombre: "Creatina ON - 120 Servicios",
        precio: 50,
        imagen: "014.jpg",
        descripcion: "Creatina de Optimum Nutrition, un envase de 120 servicios para varios meses de uso."
    },
    {
        id: 6,
        nombre: "Vitamina D3 - 120 servicios",
        precio: 20,
        imagen: "vitaminad3.jpg",
        descripcion: "Suplemento de vitamina D3 para complementar tu alimentación diaria."
    },
    {
        id: 8,
        nombre: "Omega 3 - 100 servicios",
        precio: 25,
        imagen: "omega3.jpg",
        descripcion: "Ácidos grasos omega 3 en cápsulas para complementar tu alimentación."
    },
    {
        id: 10,
        nombre: "Zinc - 100 Servicios",
        precio: 20,
        imagen: "zinc.jpg",
        descripcion: "Suplemento de zinc, un mineral que forma parte de una dieta balanceada."
    },
    {
        id: 11,
        nombre: "Citrato de Magnesio - 120 Servicios",
        precio: 25,
        imagen: "magnesionowfods.jpg",
        descripcion: "Citrato de magnesio de NOW Foods para complementar tu ingesta de magnesio."
    },
    {
        id: 12,
        nombre: "Creatina Dimatize (99.9% PUREZA) - 60 Servicios",
        precio: 45,
        imagen: "dimatize.jpg",
        descripcion: "Creatina monohidratada de alta pureza (99.9%), en presentación de 60 servicios."
    },
    {
        id: 13,
        nombre: "Melatonina 3 mg con sabor a fresa - 90 Servicios",
        precio: 20,
        imagen: "melatonina001.png",
        descripcion: "Melatonina de 3 mg con sabor a fresa, en presentación de 90 servicios."
    }
];

/* =========================================
   ESTADO
   ========================================= */

const CLAVE_CARRITO = "proevidence_carrito";

// carrito = [{ id, cantidad }]
let carrito = cargarCarrito();

/* =========================================
   ELEMENTOS
   ========================================= */

const catalogo = document.getElementById("catalogo");
const buscador = document.getElementById("buscador");
const sinResultados = document.getElementById("sin-resultados");
const divCarrito = document.getElementById("carrito");
const totalEl = document.getElementById("total");
const panelCarrito = document.getElementById("panel-carrito");
const btnFlotante = document.getElementById("btn-carrito-flotante");
const flotanteCantidad = document.getElementById("flotante-cantidad");
const flotanteTotal = document.getElementById("flotante-total");
const formPedido = document.getElementById("form-pedido");
const selectPago = document.getElementById("cliente-pago");
const toast = document.getElementById("toast");

/* =========================================
   UTILIDADES
   ========================================= */

function formatoPrecio(valor) {
    return Number.isInteger(valor) ? `$${valor}` : `$${valor.toFixed(2)}`;
}

function escapar(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

function cargarCarrito() {
    try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE_CARRITO));
        if (!Array.isArray(guardado)) return [];
        // Solo conserva productos que aún existen y cantidades válidas
        return guardado.filter(item =>
            productos.some(p => p.id === item.id) &&
            Number.isInteger(item.cantidad) &&
            item.cantidad > 0
        );
    } catch (error) {
        return [];
    }
}

function guardarCarrito() {
    try {
        localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    } catch (error) {
        /* Si el navegador bloquea el almacenamiento, el carrito sigue funcionando */
    }
}

let temporizadorToast;
function mostrarAviso(mensaje) {
    toast.textContent = mensaje;
    toast.classList.add("visible");
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => {
        toast.classList.remove("visible");
    }, 1800);
}

/* =========================================
   CATÁLOGO
   ========================================= */

function mostrarProductos(lista) {
    catalogo.innerHTML = lista.map(producto => `
        <div class="producto">
            <img src="${producto.imagen}" alt="${escapar(producto.nombre)}" loading="lazy">
            <h3>${escapar(producto.nombre)}</h3>
            <span class="descripcion">${escapar(producto.descripcion)}</span>
            <p>${formatoPrecio(producto.precio)}</p>
            <button type="button" onclick="agregarAlCarrito(${producto.id})">
                Agregar
            </button>
        </div>
    `).join("");

    sinResultados.hidden = lista.length > 0;
}

buscador.addEventListener("input", () => {
    const texto = buscador.value.trim().toLowerCase();
    const filtrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(texto) ||
        p.descripcion.toLowerCase().includes(texto)
    );
    mostrarProductos(filtrados);
});

/* =========================================
   CARRITO
   ========================================= */

function agregarAlCarrito(id) {
    const existente = carrito.find(item => item.id === id);

    if (existente) {
        existente.cantidad++;
    } else {
        carrito.push({ id, cantidad: 1 });
    }

    const producto = productos.find(p => p.id === id);
    mostrarAviso(`✔ Agregado: ${producto.nombre}`);
    actualizarCarrito();
}

function cambiarCantidad(id, cambio) {
    const item = carrito.find(i => i.id === id);
    if (!item) return;

    item.cantidad += cambio;

    if (item.cantidad <= 0) {
        carrito = carrito.filter(i => i.id !== id);
    }

    actualizarCarrito();
}

function eliminar(id) {
    carrito = carrito.filter(i => i.id !== id);
    actualizarCarrito();
}

function vaciarCarrito() {
    if (carrito.length === 0) return;
    if (confirm("¿Quieres vaciar el carrito?")) {
        carrito = [];
        actualizarCarrito();
    }
}

function calcularTotales() {
    let total = 0;
    let cantidad = 0;

    carrito.forEach(item => {
        const producto = productos.find(p => p.id === item.id);
        total += producto.precio * item.cantidad;
        cantidad += item.cantidad;
    });

    return { total, cantidad };
}

function actualizarCarrito() {
    divCarrito.innerHTML = "";

    if (carrito.length === 0) {
        divCarrito.innerHTML = `<p class="carrito-vacio">Tu carrito está vacío.</p>`;
    }

    carrito.forEach(item => {
        const producto = productos.find(p => p.id === item.id);
        const subtotal = producto.precio * item.cantidad;

        divCarrito.innerHTML += `
            <div class="item-carrito">
                <div class="item-info">
                    <span class="item-nombre">${escapar(producto.nombre)}</span>
                    <span class="item-precio">
                        ${formatoPrecio(producto.precio)} c/u · Subtotal: ${formatoPrecio(subtotal)}
                    </span>
                </div>

                <div class="item-controles">
                    <button type="button" class="btn-cantidad" onclick="cambiarCantidad(${item.id}, -1)" aria-label="Quitar uno">−</button>
                    <span class="cantidad">${item.cantidad}</span>
                    <button type="button" class="btn-cantidad" onclick="cambiarCantidad(${item.id}, 1)" aria-label="Agregar uno">+</button>
                    <button type="button" class="btn-eliminar" onclick="eliminar(${item.id})" aria-label="Eliminar producto">❌</button>
                </div>
            </div>
        `;
    });

    const { total, cantidad } = calcularTotales();

    totalEl.innerText = `Total: ${formatoPrecio(total)}`;
    flotanteCantidad.innerText = cantidad;
    flotanteTotal.innerText = formatoPrecio(total);
    btnFlotante.classList.toggle("con-productos", cantidad > 0);

    guardarCarrito();
}

/* Panel del carrito en móvil */

function abrirCarrito() {
    panelCarrito.classList.add("abierto");
    document.body.classList.add("carrito-abierto");
}

function cerrarCarrito() {
    panelCarrito.classList.remove("abierto");
    document.body.classList.remove("carrito-abierto");
}

btnFlotante.addEventListener("click", abrirCarrito);
document.getElementById("btn-cerrar-carrito").addEventListener("click", cerrarCarrito);
document.getElementById("btn-vaciar").addEventListener("click", vaciarCarrito);

/* =========================================
   WHATSAPP
   ========================================= */

function enviarWhatsApp(nombre, zona, pago) {
    let mensaje = "Hola, deseo realizar el siguiente pedido:\n\n";

    carrito.forEach(item => {
        const producto = productos.find(p => p.id === item.id);
        const subtotal = producto.precio * item.cantidad;

        mensaje += `• ${producto.nombre}\n`;
        mensaje += `   ${item.cantidad} x ${formatoPrecio(producto.precio)} = ${formatoPrecio(subtotal)}\n`;
    });

    const { total } = calcularTotales();

    mensaje += `\nTotal: ${formatoPrecio(total)}\n`;
    mensaje += `\nNombre: ${nombre}`;
    mensaje += `\nZona de entrega: ${zona}`;
    mensaje += `\nForma de pago: ${pago}`;

    window.open(
        `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`,
        "_blank"
    );
}

formPedido.addEventListener("submit", evento => {
    evento.preventDefault();

    if (carrito.length === 0) {
        alert("El carrito está vacío");
        return;
    }

    const nombre = document.getElementById("cliente-nombre").value.trim();
    const zona = document.getElementById("cliente-zona").value.trim();
    const pago = selectPago.value;

    enviarWhatsApp(nombre, zona, pago);
});

/* =========================================
   PEDIDO PERSONALIZADO
   ========================================= */

/* Subida de fotos */

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

const formPersonalizado = document.getElementById("form-personalizado");
const inputFoto = document.getElementById("pers-foto");
const vistaFoto = document.getElementById("vista-foto");
const vistaFotoImg = document.getElementById("vista-foto-img");
const avisoPersonalizado = document.getElementById("aviso-personalizado");

const TAMANO_MAXIMO_FOTO = 8 * 1024 * 1024; // 8 MB

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

formPersonalizado.addEventListener("submit", async evento => {
    evento.preventDefault();

    const producto = document.getElementById("pers-producto").value.trim();
    const marca = document.getElementById("pers-marca").value.trim();
    const cantidad = document.getElementById("pers-cantidad").value || "1";
    const enlace = document.getElementById("pers-enlace").value.trim();
    const detalles = document.getElementById("pers-detalles").value.trim();
    const nombre = document.getElementById("pers-nombre").value.trim();
    const zona = document.getElementById("pers-zona").value.trim();
    const archivo = inputFoto.files[0];
    const boton = formPersonalizado.querySelector('button[type="submit"]');
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
        avisoPersonalizado.textContent = foto.fallo
            ? "No pudimos subir la foto automáticamente. Se abrió WhatsApp con tu consulta; adjunta tu foto en el chat con el clip 📎 antes de enviar."
            : "Se abrió WhatsApp con tu consulta. Recuerda adjuntar tu foto en el chat con el clip 📎 antes de enviar.";
    } else {
        avisoPersonalizado.textContent = "Se abrió WhatsApp con tu consulta. Presiona enviar y te responderemos pronto.";
    }
    avisoPersonalizado.hidden = false;

    // Limpia las cajas para una nueva consulta
    formPersonalizado.reset();
    quitarFoto();
});

/* =========================================
   RESEÑAS DE CLIENTES
   ========================================= */

// Reseñas publicadas en el sitio.
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

function renderResenas() {
    const lista = document.getElementById("lista-resenas");
    const sinResenas = document.getElementById("sin-resenas");

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

    sinResenas.hidden = resenas.length > 0;
}

/* Vista previa de la foto del formulario de reseñas */

const resInputFoto = document.getElementById("res-foto");
const resVistaFoto = document.getElementById("res-vista-foto");
const resVistaFotoImg = document.getElementById("res-vista-foto-img");

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

const formResena = document.getElementById("form-resena");

formResena.addEventListener("submit", async evento => {
    evento.preventDefault();

    const nombre = document.getElementById("res-nombre").value.trim();
    const producto = document.getElementById("res-producto").value.trim();
    const estrellas = Number(document.getElementById("res-estrellas").value);
    const comentario = document.getElementById("res-comentario").value.trim();
    const archivo = resInputFoto.files[0];
    const aviso = document.getElementById("aviso-resena");
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
        aviso.textContent = foto.fallo
            ? "No pudimos subir la foto automáticamente. Se abrió WhatsApp con tu reseña; adjunta tu foto en el chat con el clip 📎 antes de enviar. ¡Gracias!"
            : "Se abrió WhatsApp con tu reseña. Recuerda adjuntar tu foto en el chat con el clip 📎 antes de enviar. ¡Gracias!";
    } else {
        aviso.textContent = "Se abrió WhatsApp con tu reseña. Presiona enviar. ¡Gracias por tu opinión!";
    }
    aviso.hidden = false;

    // Limpia las cajas
    formResena.reset();
    resQuitarFoto();
});

/* =========================================
   INICIO
   ========================================= */

formasDePago.forEach(forma => {
    const opcion = document.createElement("option");
    opcion.value = forma;
    opcion.textContent = forma;
    selectPago.appendChild(opcion);
});

document.getElementById("anio").textContent = new Date().getFullYear();

// Si la subida automática está activa, cambia el aviso de las fotos
if (subidaDeFotosActiva()) {
    document.querySelectorAll(".nota-foto").forEach(nota => {
        nota.textContent = "Tu foto se sube automáticamente y su enlace va dentro del mensaje de WhatsApp.";
    });
}

mostrarProductos(productos);
actualizarCarrito();
renderResenas();
