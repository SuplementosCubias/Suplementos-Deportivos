const telefono = "50376600656";

const productos = [
  {
    id: 1,
    nombre: "Creatina Planitun 80 Servicios",
    precio: 40,
    imagen: "001.jpg",
    stock: true
  },
  {
    id: 2,
    nombre: "Creatina Micronizada 120 Servicios",
    precio: 55,
    imagen: "014.jpg",
    stock: true
  },
  {
    id: 3,
    nombre: "Creatina Micronizada 60 Servicios",
    precio: 30,
    imagen: "008.jpg",
    stock: true
  }
];

const estudios = [
  {
    producto: "Creatina",
    descripcion: "La creatina mejora la fuerza, potencia y rendimiento deportivo.",
    link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12665265/"
  },
  {
    producto: "Ashwagandha",
    descripcion: "Puede ayudar a reducir el estrés y mejorar el bienestar general.",
    link: "https://pubmed.ncbi.nlm.nih.gov/41830041/"
  }
];

let carrito = [];

const catalogo = document.getElementById("catalogo");
const carritoDiv = document.getElementById("carrito");
const totalDiv = document.getElementById("total");
const estudiosDiv = document.getElementById("estudios");

/* PRODUCTOS */

function cargarProductos() {
  catalogo.innerHTML = "";

  productos.forEach(producto => {
    catalogo.innerHTML += `
      <div class="producto">
        ${producto.imagen}producto.nombre}">
        <h3>${producto.nombre}</h3>
        <p>$${producto.precio}</p>

        ${
          producto.stock
            ? `<button onclick="agregarAlCarrito(${producto.id})">Agregar al carrito</button>`
            : `<p style="color:red;">Sin stock</p>`
        }
      </div>
    `;
  });
}

/* CARRITO */

function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);

  if (!producto) return;

  carrito.push(producto);

  actualizarCarrito();
}

function eliminarDelCarrito(indice) {
  carrito.splice(indice, 1);

  actualizarCarrito();
}

function actualizarCarrito() {
  carritoDiv.innerHTML = "";

  let total = 0;

  carrito.forEach((producto, indice) => {
    total += producto.precio;

    carritoDiv.innerHTML += `
      <p>
        ${producto.nombre} - $${producto.precio}
        <button onclick="eliminarDelCarrito(${indice})">
          ❌
        </button>
      </p>
    `;
  });

  totalDiv.textContent = `Total: $${total}`;
}

/* WHATSAPP */

function enviarWhatsApp() {

  if (carrito.length === 0) {
    alert("El carrito está vacío");
    return;
  }

  let mensaje = "Hola, deseo realizar el siguiente pedido:%0A%0A";
  let total = 0;

  carrito.forEach(producto => {
    mensaje += `• ${producto.nombre} - $${producto.precio}%0A`;
    total += producto.precio;
  });

  mensaje += `%0A💰 Total: $${total}`;

  window.open(
    `https://wa.me/${telefono}?text=${mensaje}`,
    "_blank"
  );
}

/* ESTUDIOS */

function cargarEstudios() {
  estudiosDiv.innerHTML = "";

  estudios.forEach(estudio => {
    estudiosDiv.innerHTML += `
      <div class="estudio">
        <h3>${estudio.producto}</h3>
        <p>${estudio.descripcion}</p>

        ${estudio.link}
          Ver estudio científico
        </a>
      </div>
    `;
  });
}

/* INICIO */

cargarProductos();
cargarEstudios();
