const telefono = "50376600656";

const productos = [
    {
        id: 1,
        nombre: "Creatina Planitum 80 Servicios",
        precio: 45,
        imagen: "001.jpg"
    },
    {
        id: 2,
        nombre: "Creatina Micronizada 120 Servicios",
        precio: 55,
        imagen: "014.jpg"
    },
    {
        id: 3,
        nombre: "Creatina Micronizada 60 Servicios",
        precio: 35,
        imagen: "008.jpg"
    },
        {
        id: 4,
        nombre: "Ashwagandha optimizada - Suplemento para el manejo del estrés",
        precio: SIN STOCK,
        imagen: "ashwaganda.jpg"
    },
    {
        id: 5,
        nombre: "Dymatize Creatine Monohydrate",
        precio: SIN STOCK,
        imagen: "dimatize.jpg"
    },
        {
        id: 6,
        nombre: "Vitamina D-3 5000 IU",
        precio: SIN STOCK,
        imagen: "vitaminad3.jpg"
    },  {
        id: 7,
        nombre: "Pre workout johnwick | 8 g citrulina",
        precio: 55,
        imagen: "johnwick.jpg"
    },  {
        id: 8,
        nombre: "Omega 3",
        precio: SIN STOCK,
        imagen: "omega3.jpg"
        },
        {
        id: 9,
        nombre: "MuscleTech - Amplificador de testosterona",
        precio: SIN STOCK,
        imagen: "testosterona.jpg"
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
