import type { FC, ReactNode } from "react";
import "./globals.css";

export const metadata = {
    title: "Expo Visual Review",
    description: "Local native screen review for Senswave",
};
interface LayoutProps {
    children: ReactNode;
}
const Layout: FC<LayoutProps> = ({ children }) => (
    <html lang="en">
        <body>{children}</body>
    </html>
);
export default Layout;
