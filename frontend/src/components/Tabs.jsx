// frontend/src/components/Tabs.jsx

import React from "react";
import { NavLink } from "react-router-dom";

const TabLink = ({ to, children, icon: Icon }) => {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `inline-flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
          isActive
            ? "border-primary-600 text-primary-600"
            : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
        }`
      }
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </NavLink>
  );
};

function Tabs({ user }) {
  if (!user) return null;

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1">
          <TabLink
            to="/"
            icon={(props) => (
              <svg
                {...props}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            )}
          >
            My Tasks
          </TabLink>

          <TabLink
            to="/library"
            icon={(props) => (
              <svg
                {...props}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                />
              </svg>
            )}
          >
            Library
          </TabLink>

          {user.role === "Admin" && (
            <TabLink
              to="/admin/users"
              icon={(props) => (
                <svg
                  {...props}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              )}
            >
              User Management
            </TabLink>
          )}
        </div>
      </div>
    </div>
  );
}

export default Tabs;
