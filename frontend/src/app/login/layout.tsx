import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "81cc - Login | Plataforma de Gestion para Talleres Mecanicos",
  description:
    "Accede a 81cc y gestiona turnos, inventario y clientes de tu taller mecanico en una sola plataforma. Facturacion automatica y reportes en tiempo real.",
  openGraph: {
    title: "81cc - Gestion de Talleres Simplificada",
    description: "La plataforma todo-en-uno para talleres mecanicos en Latinoamerica",
    type: "website",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
