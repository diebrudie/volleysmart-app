
import { Routes, Route } from "react-router-dom";
import AppProviders from "@/components/providers/AppProviders";
import { routes } from "@/routes";

const App = () => (
  <AppProviders>
    <Routes>
      {routes.map((route, index) => (
        <Route key={index} path={route.path} element={route.element} />
      ))}
    </Routes>
  </AppProviders>
);

export default App;
