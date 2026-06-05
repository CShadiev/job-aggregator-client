import { ConfigProvider } from "antd";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./layouts/AppShell";
import JobsPage from "./pages/jobs/JobsPage";
import LoginPage from "./pages/login/LoginPage";
import themeConfig from "./themeConfig";
import "./app.sass";

export default function App() {
  return (
    <ConfigProvider theme={themeConfig}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<JobsPage />} />
            <Route path="/jobs" element={<JobsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConfigProvider>
  );
}
