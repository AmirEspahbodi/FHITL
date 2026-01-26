import React, { useState } from "react";
import { useNonSuperUsers } from "../hooks/queries";
import { userService } from "../api/services/userService";

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserListModal: React.FC<UserListModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data, isLoading, isError, error } = useNonSuperUsers();
  const [downloadingUserId, setDownloadingUserId] = useState<string | null>(
    null,
  );

  const handleDownloadDataset = async (userId: string) => {
    try {
      setDownloadingUserId(userId);

      // 1. Fetch the Blob
      const blob = await userService.getUserDataset(userId);

      // 2. Create Object URL
      const url = window.URL.createObjectURL(blob);

      // 3. Create temporary link and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `dataset_${userId}.json`);
      document.body.appendChild(link);
      link.click();

      // 4. Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download dataset", err);
      // Optional: Add toast notification logic here if available in your app context
    } finally {
      setDownloadingUserId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900 bg-opacity-50 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl border border-slate-200">
          {/* Header */}
          <div className="bg-slate-50 px-4 py-3 sm:px-6 border-b border-slate-200 flex justify-between items-center">
            <h3
              className="text-base font-semibold leading-6 text-slate-900"
              id="modal-title"
            >
              User Directory
            </h3>
            <button
              type="button"
              className="rounded-md bg-white text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content Body */}
          <div className="px-4 py-5 sm:p-6 max-h-[70vh] overflow-y-auto">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
                <p className="text-slate-500 text-sm">Loading users...</p>
              </div>
            )}

            {isError && (
              <div className="text-center py-10">
                <div className="text-red-500 text-4xl mb-3">⚠️</div>
                <h3 className="text-lg font-medium text-slate-900">
                  Failed to load users
                </h3>
                <p className="text-slate-500 mt-1 text-sm">
                  {error?.message || "Unknown error occurred"}
                </p>
              </div>
            )}

            {!isLoading && !isError && data && (
              <>
                {data.users.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 italic">
                    No non-superuser accounts found.
                  </div>
                ) : (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-300">
                      <thead className="bg-slate-50">
                        <tr>
                          <th
                            scope="col"
                            className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-slate-900 sm:pl-6"
                          >
                            Full Name
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900"
                          >
                            Email
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900"
                          >
                            User ID
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-center text-xs font-semibold text-slate-900"
                          >
                            Revised Count
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-center text-xs font-semibold text-slate-900"
                          >
                            Status
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-center text-xs font-semibold text-slate-900"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {data.users.map((user) => (
                          <tr
                            key={user.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">
                              {user.full_name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                              {user.email}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-400 font-mono text-xs">
                              <span title={user.id}>
                                {user.id.substring(0, 8)}...
                                {user.id.substring(user.id.length - 4)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 text-center font-medium">
                              {user.revised_count}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                  user.is_active
                                    ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                                    : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                                }`}
                              >
                                {user.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                              <button
                                onClick={() => handleDownloadDataset(user.id)}
                                disabled={downloadingUserId === user.id}
                                className="inline-flex items-center justify-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Download Dataset"
                              >
                                {downloadingUserId === user.id ? (
                                  <svg
                                    className="animate-spin h-4 w-4 text-blue-600"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                ) : (
                                  <>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                      className="w-4 h-4 mr-1.5 text-slate-500"
                                    >
                                      <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                                      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                                    </svg>
                                    Download
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-4 text-right text-xs text-slate-400">
                  Total revised comments across all users: {data.total_comments}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
