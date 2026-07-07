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
        descripcion: "Mejora fuerza, potencia y rendimiento deportivo.",
        link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12665265/"
    }
];

let carrito = [];

/* CATÁLOGO */

const catalogo = document.getElementById("catalogo");

productos.forEach(producto => {

    catalogo.innerHTML += `
        <div class="producto ${!producto.stock ? 'sin-stock' : ''}">

            ${producto.imagen}.nombre}">

            <h3>${producto.nombre}</h3>

            <p>$${producto.precio}</p>

            ${
                producto.stock
                ? `<button onclick="agregarAlCarrito(${producto.id})">Agregar</button>`
                : `<p>Sin Stock</p>`
            }

        </div>
    `;
});

/* CARRITO */

function agregarAlCarrito(id){

    const producto =
        productos.find(p => p.id === id);

    carrito.push(producto);

    actualizarCarrito();
}

function actualizarCarrito(){

    const divCarrito =
        document.getElementById("carrito");

    let total = 0;

    divCarrito.innerHTML = "";

    carrito.forEach((producto,index)=>{

        total += producto.precio;

        divCarrito.innerHTML += `
            <p>
                ${producto.nombre}
                - $${producto.precio}

                <button onclick="eliminar(${index})">
                    ❌
                </button>
            </p>
        `;
    });

    document.getElementById("total").innerText =
        "Total: $" + total;
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

    `;
});
