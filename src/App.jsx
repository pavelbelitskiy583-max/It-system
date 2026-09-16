import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { RequireAuth, RequirePermission, RequireAdmin } from "./layout/Guards";
import Shell from "./layout/Shell";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Warehouse from "./pages/Warehouse";
import Cartridges from "./pages/Cartridges";
import Equipment from "./pages/Equipment";
import Tasks from "./pages/Tasks";
import Messenger from "./pages/Messenger";
import Vault from "./pages/Vault";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <Shell />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="warehouse" element={<RequirePermission moduleId="warehouse"><Warehouse /></RequirePermission>} />
              <Route path="cartridges" element={<RequirePermission moduleId="cartridges"><Cartridges /></RequirePermission>} />
              <Route path="equipment" element={<RequirePermission moduleId="equipment"><Equipment /></RequirePermission>} />
              <Route path="tasks" element={<RequirePermission moduleId="tasks"><Tasks /></RequirePermission>} />
              <Route path="messenger" element={<RequirePermission moduleId="messenger"><Messenger /></RequirePermission>} />
              <Route path="vault" element={<RequirePermission moduleId="vault"><Vault /></RequirePermission>} />
              <Route path="settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
