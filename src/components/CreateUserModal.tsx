import React, { useState, useEffect } from "react";
import { useCreateUser } from "../hooks/queries/useUsers";
import { CreateUserRequest, ValidationError } from "../api/types";
import { ApiErrorType } from "../api/client";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: "",
    password: "",
    full_name: "",
    is_active: true,
    is_superuser: false,
  });

  const { mutate, isPending, error, reset } = useCreateUser();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: "",
        password: "",
        full_name: "",
        is_active: true,
        is_superuser: false,
      });
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(formData, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  // Helper to extract validation error for a specific field
  const getFieldError = (fieldName: string): string | undefined => {
    if (
      error?.errorType === ApiErrorType.VALIDATION_ERROR &&
      error.response?.data?.detail &&
      Array.isArray(error.response.data.detail)
    ) {
      const validationErrors = error.response.data.detail as ValidationError[];
      const fieldError = validationErrors.find((err) =>
        err.loc.includes(fieldName),
      );
      return fieldError?.msg;
    }
    return undefined;
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      ></div>

      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Header */}
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3.75 15h2.25M4.5 17.25h2.25m-6 2.25h2.25M12 13.875a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm9.75-3.75V9A6.75 6.75 0 0012 2.25 6.75 6.75 0 005.25 9v.75m10.5 0V9a5.25 5.25 0 10-10.5 0v.75"
                  />
                </svg>
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3
                  className="text-xl font-semibold leading-6 text-slate-900"
                  id="modal-title"
                >
                  Create New User
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-slate-500">
                    Add a new user to the system. They will receive access based
                    on the permissions set below.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-4 py-3 sm:px-6">
            {/* General Error Message (e.g., 400 Bad Request or Network Error) */}
            {error && error.errorType !== ApiErrorType.VALIDATION_ERROR && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error.userMessage}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="full_name"
                  className="block text-sm font-medium leading-6 text-slate-900"
                >
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="full_name"
                    id="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>
                {getFieldError("full_name") && (
                  <p className="mt-1 text-sm text-red-600">
                    {getFieldError("full_name")}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium leading-6 text-slate-900"
                >
                  Email Address
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>
                {getFieldError("email") && (
                  <p className="mt-1 text-sm text-red-600">
                    {getFieldError("email")}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium leading-6 text-slate-900"
                >
                  Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="password"
                    id="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>
                {getFieldError("password") && (
                  <p className="mt-1 text-sm text-red-600">
                    {getFieldError("password")}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-6 py-2">
                <div className="relative flex items-start">
                  <div className="flex h-6 items-center">
                    <input
                      id="is_active"
                      name="is_active"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                  </div>
                  <div className="ml-3 text-sm leading-6">
                    <label
                      htmlFor="is_active"
                      className="font-medium text-slate-900"
                    >
                      Active
                    </label>
                    <p className="text-slate-500">User can log in.</p>
                  </div>
                </div>

                <div className="relative flex items-start">
                  <div className="flex h-6 items-center">
                    <input
                      id="is_superuser"
                      name="is_superuser"
                      type="checkbox"
                      checked={formData.is_superuser}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                  </div>
                  <div className="ml-3 text-sm leading-6">
                    <label
                      htmlFor="is_superuser"
                      className="font-medium text-slate-900"
                    >
                      Superuser
                    </label>
                    <p className="text-slate-500">Full admin privileges.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-6 sm:mt-8 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
              >
                {isPending ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </button>
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
