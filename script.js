/* =========================================
   CONFIGURACIÓN DE LA TIENDA (edita aquí)
   El teléfono y las reseñas están en compartido.js
   ========================================= */

// Formas de pago que aparecen en el pedido.
// Cámbialas por las que realmente aceptas.
const formasDePago = [
    "Lo coordino por WhatsApp",
    "Transferencia bancaria",
    "Efectivo contra entrega"
];

const productos = [
    {
        id: 1,
        nombre: "Creatina Planitum - 80 Servicios",
        precio: 45,
        imagen: "001.jpg",
        descripcion: "Ayuda a mejorar la fuerza, la potencia y el rendimiento en entrenamientos intensos, y apoyan la recuperación muscular"
    },
    {
        id: 2,
        nombre: "Creatina ON - 120 Servicios",
        precio: 53,
        imagen: "014.jpg",
        descripcion: "Ayuda a mejorar la fuerza, la potencia y el rendimiento en entrenamientos intensos, y apoyan la recuperación muscular."
    },
    {
        id: 6,
        nombre: "Vitamina D3 - 120 servicios",
        precio: 20,
        imagen: "vitaminad3.jpg",
        descripcion: "Apoya huesos y dientes, la absorción del calcio y el sistema inmune."
    },
    {
        id: 8,
        nombre: "Omega 3 - 100 servicios",
        precio: 25,
        imagen: "omega3.jpg",
        descripcion: "Ácidos grasos omega 3 en cápsulas para apoyar la salud del corazón, el cerebro y la visión."
    },
    {
        id: 10,
        nombre: "Zinc - 100 Servicios",
        precio: 20,
        imagen: "zinc.jpg",
        descripcion: "Apoya el sistema inmune"
    },
    {
        id: 11,
        nombre: "Citrato de Magnesio - 120 Servicios",
        precio: 25,
        imagen: "magnesionowfods.jpg",
        descripcion: "Apoya músculos y nervios, y la relajación muscular"
    },
    {
        id: 12,
        nombre: "Creatina Dimatize (99.9% PUREZA) - 60 Servicios",
        precio: 45,
        imagen: "dimatize.jpg",
        descripcion: "Creatina monohidratada de alta pureza (99.9%), en presentación de 60 servicios."
    },
    {
        id: 14,
        nombre: "Creatina NUTREX - 60 Servicios",
        precio: 30,
        imagen: "nutrex60s.jpg",
        descripcion: "Ayuda a mejorar la fuerza, la potencia y el rendimiento en entrenamientos de alta intensidad, y apoya la recuperación muscular."
    },
    {
        id: 15,
        nombre: "Nutricost D3 K2 - 120 Servicios",
        precio: 25,
        imagen: "k2d3.png",
        descripcion: "Combina vitamina D3, que apoya los huesos, los dientes y el sistema inmune, con vitamina K2, que ayuda a que el calcio se aproveche en los huesos."
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
   WHATSAPP: PEDIDO DEL CARRITO
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
   CONSULTAR UN PRODUCTO QUE NO ESTÁ EN EL CATÁLOGO
   ========================================= */

// Lleva a consulta.html. Si el cliente escribió algo en el buscador,
// ese texto llega escrito como el producto que busca.
function consultarProducto() {
    const buscado = buscador.value.trim();

    window.location.href = buscado
        ? `consulta.html?producto=${encodeURIComponent(buscado)}`
        : "consulta.html";
}

document.querySelectorAll(".js-consultar-producto").forEach(elemento => {
    elemento.addEventListener("click", evento => {
        evento.preventDefault();
        consultarProducto();
    });
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

mostrarProductos(productos);
actualizarCarrito();
renderResenas();
