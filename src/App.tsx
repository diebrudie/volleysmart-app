
import { Routes, Route, useRoutes } from "react-router-dom";
import AppProviders from "@/components/providers/AppProviders";
import { routes } from "@/routes";

const AppRoutes = () => {
  return (
    <Routes>
      {routes.map((route, index) => (
        <Route key={index} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
};

const App = () => (
  <AppProviders>
    <AppRoutes />
  </AppProviders>
);

export default App;
