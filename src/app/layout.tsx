import "./globals.css"; 

export const metadata = {
  title: "Orion",
  description: "Project management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body>
        {children}
      </body>
    </html>
  );
}