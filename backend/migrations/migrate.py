import mysql.connector
from config import Config

def main():
    conn = mysql.connector.connect(**Config.DB_CONFIG)
    cur = conn.cursor()
    
    # 1. categorias_propias
    cur.execute("""
        CREATE TABLE IF NOT EXISTS categorias_propias (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL UNIQUE,
            orden INT DEFAULT 0,
            activa BOOLEAN DEFAULT TRUE
        )
    """)
    
    # 2. muebles_propios
    cur.execute("""
        CREATE TABLE IF NOT EXISTS muebles_propios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(150) NOT NULL,
            descripcion TEXT,
            video_url VARCHAR(500),
            medidas VARCHAR(255),
            precio INT NOT NULL,
            categoria_id INT NOT NULL,
            activo BOOLEAN DEFAULT TRUE,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (categoria_id) REFERENCES categorias_propias(id) ON UPDATE CASCADE ON DELETE RESTRICT
        )
    """)
    
    # 3. muebles_propios_imagenes
    cur.execute("""
        CREATE TABLE IF NOT EXISTS muebles_propios_imagenes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            mueble_id INT NOT NULL,
            imagen_url VARCHAR(255) NOT NULL,
            orden INT DEFAULT 0,
            FOREIGN KEY (mueble_id) REFERENCES muebles_propios(id) ON DELETE CASCADE
        )
    """)
    
    # 4. solicitudes: vinculo con muebles propios (producto_id solo apunta a muebles externos)
    cur.execute("""
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'mueble_propio_id'
    """)
    if cur.fetchone()[0] == 0:
        cur.execute("ALTER TABLE solicitudes ADD COLUMN mueble_propio_id INT NULL")
        cur.execute("""
            ALTER TABLE solicitudes
            ADD CONSTRAINT fk_solicitudes_mueble_propio
            FOREIGN KEY (mueble_propio_id) REFERENCES muebles_propios(id) ON DELETE SET NULL
        """)

    conn.commit()
    cur.close()
    conn.close()
    print("Migración de tablas de muebles propios exitosa.")

if __name__ == '__main__':
    main()