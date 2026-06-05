const telefono = "50376600656";

const productos = [
  { id: 1, nombre: "Creatina Planitun", precio: 40, imagen: "001.jpg" },
  { id: 2, nombre: "Creatina Dimatize", precio: 45, imagen: "002.jpg" },
  { id: 3, nombre: "Ashwagandha", precio: 15, imagen: "003.jpg" },
  { id: 4, nombre: "Test Booster", precio: 35, imagen: "004.jpg" },
  { id: 5, nombre: "Pre NITROSURGE", precio: 35, imagen: "005.jpg" },
  { id: 6, nombre: "Pre The Curse", precio: 30, imagen: "006.jpg" },
  { id: 7, nombre: "Kaged Pre Workout", precio: 35, imagen: "007.jpg" },
  { id: 8, nombre: "Creatina Micronizada", precio: 35, imagen: "008.jpg" }
];

let carrito = [];

const catalogo = document.getElementById("catalogo");

productos.forEach(p => {
  catalogo.innerHTML += `
    <div class="producto">
      <img src="${p.imagen}" alt="${p.nombre}">
      <h3>${p.nombre}</h3>
      <p>$${p.precio}</p>
      <button onclick="agregarAlCarrito(${p.id})">Agregar</button>
    </div>
  `;
});

function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);
  const existente = carrito.find(p => p.id === id);

  if (existente) {
    existente.cantidad++;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }

  actualizarCarrito();
}

function actualizarCarrito() {
  const contenedor = document.getElementById("carrito");
  contenedor.innerHTML = "";

  let total = 0;

  carrito.forEach(p => {
    total += p.precio * p.cantidad;

    contenedor.innerHTML += `
      <p>${p.nombre} x${p.cantidad} - $${p.precio * p.cantidad}</p>
    `;
  });

  document.getElementById("total").innerText = "Total: $" + total;
}

function enviarWhatsApp() {
  if (carrito.length === 0) {
    alert("El carrito está vacío");
    return;
  }

  let mensaje = "Hola, quiero hacer este pedido:%0A";

  carrito.forEach(p => {
    mensaje += `- ${p.nombre} x${p.cantidad} = $${p.precio * p.cantidad}%0A`;
  });

  const total = carrito.reduce((sum, p) => sum + p.precio * p.cantidad, 0);

  mensaje += `%0ATotal: $${total}`;

  const url = `https://wa.me/${telefono}?text=${mensaje}`;

  window.open(url, "_blank");
}

const estudios = [
  {
    producto: "Creatina",
    descripcion: "Mejora la fuerza muscular.",
    link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12665265/"
  },
  {
    producto: "Ashwagandha",
    descripcion: "Reduce estrés.",
    link: "https://pubmed.ncbi.nlm.nih.gov/41830041/"
  },
  {
    producto: "Pre Entreno",
    descripcion: "Aumenta energía.",
    link: "https://jissn.biomedcentral.com/"
  },
  {
    producto: "Calculadora de macros",
    descripcion: "Herramienta útil online.",
    link: "https://www.calculator.net/macro-calculator.html"
  }
];

const contenedorEstudios = document.getElementById("estudios");

estudios.forEach(e => {
  contenedorEstudios.innerHTML += `
    <div class="estudio">
      <h3>${e.producto}</h3>
      <p>${e.descripcion}</p>
      <a href="${e.link}" target="_blank">🔗 Ver estudio científico</a>
    </div>
  `;
});
