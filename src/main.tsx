import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { InventoryProvider } from "./context/InventoryContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <InventoryProvider>
        <App />
      </InventoryProvider>
    </AuthProvider>
  </React.StrictMode>
);
