import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RequireAuth({ children }) {
  const { ready, user } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/auth?mode=login" replace />;
  return children;
}

export function RequirePermission({ moduleId, children }) {
  const { can } = useAuth();
  if (!can(moduleId)) {
    return (
      <div className="content">
        <div className="empty" style={{ padding: "100px 20px" }}>
          Доступ к разделу «{moduleId}» вам не открыт.<br />Обратитесь к администратору организации.
        </div>
      </div>
    );
  }
  return children;
}

export function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <div className="content">
        <div className="empty" style={{ padding: "100px 20px" }}>Раздел доступен только администратору.</div>
      </div>
    );
  }
  return children;
}
