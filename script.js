const telefono = "50376600656";

const productos = [
    {
        id: 1,
        nombre: "Creatina Planitum - 80 Servicios",
        precio: 40,
        imagen: "001.jpg"
    },
    {
        id: 2,
        nombre: "Creatina ON - 120 Servicios",
        precio: 50,
        imagen: "014.jpg"
    },
        {
        id: 4,
        nombre: "Ashwaganda - 60 Servicios",
        precio: 25,
        imagen: "ashwaganda.jpg"
    },
        {
        id: 6,
        nombre: "Vitamina D3 - 120 servicios",
        precio: 20,
        imagen: "vitaminad3.jpg"
    },  {
        id: 8,
        nombre: "Omega 3 - 100 servicios",
        precio: 23,
        imagen: "omega3.jpg"
        },
        {
        id: 10,
        nombre: "Zinc - 100 Servicios",
        precio: 20,
        imagen: "zinc.jpg"
        },
        {
        id: 11,
        nombre: "Citrato de Magnesio - 120 Servicios",
        precio: 22,
        imagen: "magnesionowfods.jpg"
        },
        {
        id: 12,
        nombre: "Creatina Dimatize (99.9% PUREZA) - 60 Servicios",
        precio: 40,
        imagen: "dimatize.jpg"
        },
        {
        id: 13,
        nombre: "Collagen Peptides for Women & Men, GLP-1 - 150 Servicios",
        precio: 35,
        imagen: "colagenoforwoman.jpg"
        },
        {
        id: 13,
        nombre: "Vitamina C - 100 Servicios",
        precio: 20,
        imagen: "vitaminac.jpg"
        },
        {
        id: 14,
        nombre: "Suplemento en gomitas para cabello, piel y uñas 90 Servicios",
        precio: 20,
        imagen: "20624362.jpeg"
        },
        {
        id: 15,
        nombre: "Multi Vitaminas sabor fresa GOMITAS - 30 Servicios",
        precio: 20,
        imagen: "gomitas1.jpg"
        },
        {
        id: 16,
        nombre: "Multi Vitaminas One Daily - 100 Servicios",
        precio: 18,
        imagen: "onedaily.jpg"
        }
];

let carrito = [];

const catalogo = document.getElementById("catalogo");

/* CARGAR PRODUCTOS */

productos.forEach(producto => {

    catalogo.innerHTML += `
        <div class="producto">

            <img src="${producto.imagen}" alt="${producto.nombre}">

            <h3>${producto.nombre}</h3>

            <p>$${producto.precio}</p>

            <button onclick="agregarAlCarrito(${producto.id})">
                Agregar
            </button>

        </div>
    `;
});

/* CARRITO */

function agregarAlCarrito(id){

    const producto = productos.find(
        p => p.id === id
    );

    carrito.push(producto);

    actualizarCarrito();
}

function actualizarCarrito(){

    const divCarrito =
        document.getElementById("carrito");

    let total = 0;

    divCarrito.innerHTML = "";

    carrito.forEach((producto,index) => {

        total += producto.precio;

        divCarrito.innerHTML += `
            <div class="item-carrito">

                <span>
                    ${producto.nombre} - $${producto.precio}
                </span>

                <button
                    class="btn-eliminar"
                    onclick="eliminar(${index})">
                    ❌
                </button>

            </div>
        `;
    });

    document.getElementById("total").innerText =
        `Total: $${total}`;
}

function eliminar(index){

    carrito.splice(index,1);

    actualizarCarrito();
}

/* WHATSAPP */

function enviarWhatsApp(){

    if(carrito.length === 0){
        alert("El carrito está vacío");
        return;
    }

    let mensaje =
        "Hola, deseo realizar el siguiente pedido:\n\n";

    let total = 0;

    carrito.forEach(producto => {

        mensaje +=
            `• ${producto.nombre} - $${producto.precio}\n`;

        total += producto.precio;
    });

    mensaje += `\nTotal: $${total}`;

    window.open(
        `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`,
        "_blank"
    );
}
