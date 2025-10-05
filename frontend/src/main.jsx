import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import LibraryPage from "./pages/LibraryPage.jsx"; // Updated path
import MyTasksPage from "./pages/MyTasksPage.jsx"; // Import new page
import DocumentView from "./pages/DocumentView.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import UserManagementPage from "./pages/UserManagementPage.jsx";
import AdminRoute from "./auth/AdminRoute.jsx";
import "./index.css";

import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true, // "My Tasks" is now the default page at "/"
        element: <MyTasksPage />,
      },
      {
        path: "library", // "Library" is now at "/library"
        element: <LibraryPage />,
      },
      {
        path: "documents/:documentId",
        element: <DocumentView />,
      },
      {
        path: "admin/users",
        element: (
          <AdminRoute>
            <UserManagementPage />
          </AdminRoute>
        ),
      },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
