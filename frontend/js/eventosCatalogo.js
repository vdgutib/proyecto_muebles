const paginacion = { externos: 0, propios: 0, servicios: 0 };

        function getPerPage() {
            const w = window.innerWidth;
            if (w < 576) return 1;
            if (w < 992) return 2;
            return 3;
        }

        function renderSeccion(sec) {
            const grid = document.getElementById('grid-' + sec);
            const cards = Array.from(grid.querySelectorAll('.cat-card'));
            const perPage = getPerPage();
            const page = paginacion[sec];
            const total = cards.length;
            const totalPages = Math.ceil(total / perPage);
            const start = page * perPage;
            const end = Math.min(start + perPage, total);

            cards.forEach(function (card, i) {
                card.style.display = (i >= start && i < end) ? '' : 'none';
            });

            document.getElementById('counter-' + sec).textContent =
                total > 0 ? (start + 1) + '-' + end + ' de ' + total : '';

            document.getElementById('prev-' + sec).disabled = (page === 0);
            document.getElementById('next-' + sec).disabled = (page >= totalPages - 1);

            const navEl = document.getElementById('nav-' + sec);
            navEl.style.display = (total <= perPage) ? 'none' : 'flex';
        }

        function navSection(sec, dir) {
            const grid = document.getElementById('grid-' + sec);
            const total = grid.querySelectorAll('.cat-card').length;
            const totalPages = Math.ceil(total / getPerPage());
            paginacion[sec] = Math.max(0, Math.min(paginacion[sec] + dir, totalPages - 1));
            renderSeccion(sec);
        }

        function filtrarCategoria(boton, tipo) {
            document.querySelectorAll('.top-cat-btn').forEach(function (b) { b.classList.remove('active'); });
            boton.classList.add('active');

            var externo = document.getElementById('seccion-externos');
            var propio = document.getElementById('seccion-propios');
            var servicio = document.getElementById('seccion-servicios');

            if (tipo === 'todos') {
                externo.style.display = 'block';
                propio.style.display = 'block';
                servicio.style.display = 'block';
            } else if (tipo === 'compra') {
                externo.style.display = 'block';
                propio.style.display = 'block';
                servicio.style.display = 'none';
            } else {
                externo.style.display = 'none';
                propio.style.display = 'none';
                servicio.style.display = 'block';
            }
        }

        function abrirModal(nombre, precio, medidas, categoria, imagenSrc) {
            document.getElementById('m-nombre').innerText = nombre;
            document.getElementById('m-precio').innerText = precio;
            document.getElementById('m-medidas').innerText = medidas;
            document.getElementById('m-categoria').innerText = categoria;
            document.getElementById('m-imagen').src = imagenSrc;
            var myModal = new bootstrap.Modal(document.getElementById('modalProducto'));
            myModal.show();
        }

        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                paginacion.externos = 0;
                paginacion.propios = 0;
                paginacion.servicios = 0;
                renderSeccion('externos');
                renderSeccion('propios');
                renderSeccion('servicios');
            }, 150);
        });

        document.addEventListener('DOMContentLoaded', function () {
            renderSeccion('externos');
            renderSeccion('propios');
            renderSeccion('servicios');
        });