import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Website Integrity Scanner",
    description: "One-click website availability scanner for college infrastructure",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
