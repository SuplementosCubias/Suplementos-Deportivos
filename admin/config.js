/* =========================================
   CONEXIÓN CON SUPABASE (edita aquí)

   Supabase → Project Settings → API:
     - Project URL            -> SUPABASE_URL
     - anon / publishable key -> SUPABASE_ANON_KEY

   Estas dos son públicas por diseño: es normal que estén en el repositorio.
   NUNCA pegues aquí la llave "service_role" ni la "secret".
   Lo que protege tus datos es el inicio de sesión y las reglas (RLS)
   del archivo supabase/esquema.sql.
   ========================================= */

window.PE_CONFIG = {
    SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
    SUPABASE_ANON_KEY: "TU_LLAVE_ANON_O_PUBLISHABLE"
};
