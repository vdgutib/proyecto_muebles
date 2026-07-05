# Sistema de Gestión y Ventas de Muebles

Plataforma web desarrollada bajo arquitectura Cliente/Servidor (MVC Desacoplado) para la digitalización de operaciones comerciales y operativas de un emprendimiento de armado de muebles. Proyecto estructurado para el módulo de Práctica Intermedia (CFT San Agustín).

## Características Principales

*   **Catálogo Dinámico:** Visualización y filtrado de muebles propios, externos y servicios de armado.
*   **Gestión de Inventario:** Sincronización automatizada mediante la carga de archivos Excel estandarizados.
*   **Herramienta de Despiece:** Módulo de cálculo matemático para la obtención de dimensiones de corte de material.
*   **Captación de Clientes:** Formulario de solicitud de servicio vinculado a identificadores de productos.
*   **Seguridad:** Panel administrativo protegido mediante control de acceso basado en roles (RBAC).

## Stack Tecnológico

*   **Frontend:** HTML5, CSS3, JavaScript (Vanilla, Fetch API).
*   **Backend:** Python (Flask).
*   **Base de Datos:** SQL Relacional.

## Arquitectura y Estructura

El sistema implementa una separación física de responsabilidades operando mediante peticiones de red:

*   `/frontend`: Contiene las vistas, interfaces de usuario y recursos estáticos.
*   `/backend`: Contiene los controladores, lógica de negocio, validación de datos y acceso al repositorio de base de datos.

## Autores

*   Luis Barros (@LShadowFx)
*   Vicente Gutiérrez (@vdgutib)
*   Diego Araya (@ZennonGihub)
