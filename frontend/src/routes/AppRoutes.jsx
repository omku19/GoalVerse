import MainLayout from "../layouts/MainLayout.jsx";
import HomePage from "../pages/HomePage.jsx";
import LoginPage from "../pages/LoginPage.jsx";

export default function AppRoutes() {
  if (window.location.pathname === "/login") {
    return <LoginPage />;
  }

  return (
    <MainLayout>
      <HomePage />
    </MainLayout>
  );
}
