
import { ReactNode } from "react";
import MainNav from "../navigation/MainNav";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <MainNav />
      <main className="flex-1 p-4 pb-24 md:pb-4">{children}</main>
    </div>
  );
};

export default AppLayout;
