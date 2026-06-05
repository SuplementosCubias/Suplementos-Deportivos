const telefono = "50376600656";

const productos = [
  { id: 1, nombre: "Creatina Planitun", precio: 40, imagen: "001.jpg", stock: true },
  { id: 2, nombre: "Creatina Dimatize", precio: 45, imagen: "002.jpg", stock: true },
  { id: 3, nombre: "Ashwagandha", precio: 15, imagen: "003.jpg", stock: false }
];

let carrito = [];

// Mostrar productos
const catalogo = document.getElementById("catalogo");

productos.forEach(p => {
  catalogo.innerHTML += `
    <div class="producto ${!p.stock ? 'sin-stock' : ''}">
      <img src="${p.imagen}">
      <h3>${p.nombre}</h3>
      <p>$${p.precio}</p>

      ${
        p.stock
        ? `<button onclick="agregarAlCarrito(${p.id})">Agregar</button>`
        : `<p style="color:red;">SIN STOCK</p>`
      }
    </div>
  `;
});

// Carrito
function agregarAlCarrito(id) {
  const prod = productos.find(p => p.id === id);

  if (!prod.stock) {
    alert("Sin stock");
    return;
  }

  carrito.push(prod);
  actualizarCarrito();
}

function actualizarCarrito() {
  const cont = document.getElementById("carrito");
  cont.innerHTML = "";

  let total = 0;

  carrito.forEach(p => {
    total += p.precio;
    cont.innerHTML += `<p>${p.nombre} - $${p.precio}</p>`;
  });

  document.getElementById("total").innerText = "Total: $" + total;
}

// WhatsApp
function enviarWhatsApp() {
  let msg = "Pedido:%0A";

  carrito.forEach(p => {
    msg += `- ${p.nombre}%0A`;
  });

  window.open(`https://wa.me/${telefono}?text=${msg}`);
}

// Estudios
const estudios = [
  {
    producto: "Creatina",
    descripcion: "Mejora fuerza muscular",
    link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12665265/"
  }
];

const contenedor = document.getElementById("estudios");

estudios.forEach(e => {
  contenedor.innerHTML += `
    <div>
      <h3>${e.producto}</h3>
      <p>${e.descripcion}</p>
      <a href="${e.link}" target="_blank">Ver estudio</a>
    </div>
  `;
});
