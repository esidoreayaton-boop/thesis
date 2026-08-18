import { createBrowserRouter, Navigate } from "react-router";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import BhwDashboard from "./pages/BhwDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ResidentPortal from "./pages/ResidentPortal";
import BarangayPortal from "./pages/BarangayPortal";
import HealthCenterPortal from "./pages/HealthCenterPortal";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/bhw",
    Component: BhwDashboard,
  },
  {
    path: "/admin",
    Component: AdminDashboard,
  },
  {
    path: "/resident",
    Component: ResidentPortal,
  },
  {
    path: "/resident/barangay",
    Component: BarangayPortal,
  },
  {
    path: "/resident/health",
    Component: HealthCenterPortal,
  },
]);
