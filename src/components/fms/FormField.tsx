import React from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ label, required, error, children }) => {
  return (
    <div data-error={error ? label : undefined}>
      <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-[var(--color-error)] text-sm mt-1">{error}</p>}
    </div>
  );
};

export default FormField;

