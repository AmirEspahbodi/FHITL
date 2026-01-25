import React from "react";
import { useAuth } from "../hooks/useAuth";

export const AdminDashboard: React.FC = () => {
  const { logout, user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-50 text-slate-800 font-sans">
      <div className="bg-white p-12 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 text-center max-w-lg w-full">
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-red-100 text-red-600 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-10 h-10"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
            />
          </svg>
        </div>

        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">
          ADMIN USER
        </h1>

        <p className="text-slate-500 mb-8">
          Welcome back, <span className="font-semibold">{user?.username}</span>.
          <br />
          You have superuser privileges.
        </p>

        <button
          onClick={logout}
          className="w-full px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-lg hover:shadow-xl active:scale-[0.98]"
        >
          Logout
        </button>
      </div>
    </div>
  );
};
