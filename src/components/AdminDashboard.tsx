import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { UserListModal } from "./UserListModal";

export const AdminDashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-50 text-slate-800 font-sans">
      <UserListModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
      />

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

        <div className="space-y-4">
          <button
            onClick={() => setIsUsersModalOpen(true)}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
            </svg>
            Manage Users
          </button>

          <button
            onClick={logout}
            className="w-full px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
