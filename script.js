const telefono = "50376600656";

const productos = [
  { id: 1, nombre: "Creatina Planitun 80 Servicios", precio: 40, imagen: "001.jpg", stock: false },
  { id: 2, nombre: "SELLO CREAPURE - Creatina Dimatize 60 Servicios", precio: 40, imagen: "002.jpg", stock: true },
  { id: 8, nombre: "Creatina Micronizada 120 Servicios", precio: 55, imagen: "014.jpg", stock: true },
  { id: 8, nombre: "Creatina Micronizada 60 Servicios", precio: 30, imagen: "008.jpg", stock: true },
  { id: 3, nombre: "Ashwagandha 60 Servicios", precio: 20, imagen: "003.jpg", stock: false },
  { id: 4, nombre: "Test Booster 120 Servicios", precio: 35, imagen: "004.jpg", stock: false },
  { id: 5, nombre: "Pre Entrenamiento NITROSURGE - 30 servicios", precio: 35, imagen: "005.jpg", stock: false },
  { id: 6, nombre: "Pre Entrenamiento the curse - 30 servicios", precio: 30, imagen: "006.jpg", stock: false },
  { id: 7, nombre: "Kaged Sport Pre Workout", precio: 35, imagen: "007.jpg", stock: false },
  { id: 9, nombre: "Pre Entrenamiento NITROSURGE - 10 servicios", precio: 25, imagen: "009.jpg", stock: false },
  { id: 10, nombre: "Creatina Monohidratada JACKED FACTORY - 30 servicios", precio: 25, imagen: "010.jpg", stock: false },
  { id: 11, nombre: "Creatina Monohidratada the curse - 60 servicios", precio: 35, imagen: "011.jpg", stock: false },
  { id: 12, nombre: "Creatina Monohidratad Rule one - 30 servicios", precio: 25, imagen: "012.jpg", stock: false },
  { id: 13, nombre: "Creatina Monohidratad nutrex - 60 servicios", precio: 30, imagen: "013.jpg", stock: false }
];

let carrito = [];

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

// 🛒 AGREGAR
function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);

  if (!producto.stock) {
    alert("Sin stock");
    return;
  }

  carrito.push(producto);
  actualizarCarrito();
}

// ❌ ELIMINAR
function eliminarDelCarrito(id) {
  carrito = carrito.filter(p => p.id !== id);
  actualizarCarrito();
}

// 🔄 ACTUALIZAR CARRITO
function actualizarCarrito() {
  const cont = document.getElementById("carrito");
  cont.innerHTML = "";

  let total = 0;

  carrito.forEach(p => {
    total += p.precio;

    cont.innerHTML += `
      <p>
        ${p.nombre} - $${p.precio}
        <button onclick="eliminarDelCarrito(${p.id})">❌</button>
      </p>
    `;
  });

  document.getElementById("total").innerText = "Total: $" + total;
}

// 📲 WHATSAPP
function enviarWhatsApp() {
  let msg = "Pedido:%0A";

  carrito.forEach(p => {
    msg += `- ${p.nombre}%0A`;
  });

  window.open(`https://wa.me/${telefono}?text=${msg}`);
}

// 📚 ESTUDIOS
const estudios = [
  {
    producto: "Creatina",
    descripcion: "Mejora la fuerza",
    link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12665265/"
  },
  {
    producto: "Ashwagandha",
    descripcion: "Reduce el estrés",
    link: "https://pubmed.ncbi.nlm.nih.gov/41830041/"
  }
];

const contenedor = document.getElementById("estudios");

estudios.forEach(e => {
  contenedor.innerHTML += `
    <div class="estudio">
      <h3>${e.producto}</h3>
      <p>${e.descripcion}</p>
      <a href="${e.link}" target="_blank">Ver estudio</a>
    </div>
  `;
});
