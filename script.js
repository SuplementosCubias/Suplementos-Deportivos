const telefono = "50376600656";

const productos = [
  { id: 1, nombre: "Creatina Planitun 80 Servicios", precio: 40, imagen: "001.jpg", stock: true },
  { id: 2, nombre: "Creatina Dimatize 60 Servicios", precio: 45, imagen: "002.jpg", stock: true },
  { id: 3, nombre: "Ashwagandha 60 Servicios", precio: 15, imagen: "003.jpg", stock: false },
  { id: 4, nombre: "Test Booster 120 Servicios", precio: 35, imagen: "004.jpg", stock: true }
];

let carrito = [];

const catalogo = document.getElementById("catalogo");

// Mostrar productos
productos.forEach(p => {
  catalogo.innerHTML += `
    <div class="producto ${!p.stock ? 'sin-stock' : ''}">
      <img src="${p.imagen}" alt="${p.nombre}">
      <h3>${p.nombre}</h3>
      <p>$${p.precio}</p>

      ${
        p.stock
        ? `<button onclick="agregarAlCarrito(${p.id})">Agregar</button>`
        : `<p style="color:red; font-weight:bold;">SIN STOCK</p>`
      }

    </div>
  `;
});

// Carrito
function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);

  if (!producto.stock) {
    alert("Este producto no tiene stock");
    return;
  }

  carrito.push(producto);
  actualizarCarrito();
}

function actualizarCarrito() {
  const contenedor = document.getElementById("carrito");
  contenedor.innerHTML = "";

  let total = 0;

  carrito.forEach(p => {
    total += p.precio;

    contenedor.innerHTML += `
      <p>${p.nombre} - $${p.precio}</p>
    `;
  });

  document.getElementById("total").innerText = "Total: $" + total;
}

// WhatsApp
function enviarWhatsApp() {
  let mensaje = "Hola quiero comprar:%0A";

  carrito.forEach(p => {
    mensaje += `- ${p.nombre}%0A`;
  });

  window.open(`https://wa.me/${telefono}?text=${mensaje}`);
}

// Estudios
const estudios = [
  {
    producto: "Creatina",
    descripcion: "Mejora la fuerza muscular",
    link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12665265/"
  },
  {
    producto: "Ashwagandha",
    descripcion: "Reduce el estrés",
    link: "https://pubmed.ncbi.nlm.nih.gov/41830041/"
  }
];

const contenedorEstudios = document.getElementById("estudios");

estudios.forEach(e => {
  contenedorEstudios.innerHTML += `
    <div class="estudio">
      <h3>${e.producto}</h3>
      <p>${e.descripcion}</p>
      <a href="${e.link}" target="_blank">🔗 Ver estudio</a>
    </div>
  `;
});
