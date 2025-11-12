import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertCircle, CheckCircle, Eye, EyeOff, X, 
  Phone, Mail, Calendar, User, FileText, 
  Loader2, CheckCircle2, AlertTriangle
} from 'lucide-react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  min?: number;
  max?: number;
  email?: boolean;
  phone?: boolean;
  url?: boolean;
  date?: boolean;
  futureDate?: boolean;
  pastDate?: boolean;
  file?: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    maxFiles?: number;
  };
}

interface ValidationResult {
  isValid: boolean;
  error: string | null;
  warnings?: string[];
}

interface FieldValidation {
  value: any;
  result: ValidationResult;
  touched: boolean;
  dirty: boolean;
}

interface FormValidationProps {
  children: React.ReactNode;
  onSubmit?: (data: Record<string, any>) => Promise<void> | void;
  onChange?: (data: Record<string, any>, isValid: boolean) => void;
  initialData?: Record<string, any>;
  schema?: Record<string, ValidationRule>;
  submitText?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  showSuccessMessage?: boolean;
  autoValidate?: boolean;
}

interface FormDataState {
  [key: string]: FieldValidation;
}

const EnhancedFormValidation: React.FC<FormValidationProps> = ({
  children,
  onSubmit,
  onChange,
  initialData = {},
  schema = {},
  submitText = 'Submit',
  loading = false,
  disabled = false,
  className = '',
  showSuccessMessage = true,
  autoValidate = true
}) => {
  const [formData, setFormData] = useState<FormDataState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);

  // Initialize form data
  useEffect(() => {
    const initialFormData: FormDataState = {};
    
    Object.keys(schema).forEach(fieldName => {
      const value = initialData[fieldName] || '';
      initialFormData[fieldName] = {
        value,
        result: validateField(fieldName, value, schema[fieldName]),
        touched: false,
        dirty: false
      };
    });
    
    setFormData(initialFormData);
  }, [initialData, schema]);

  // Update parent component when data changes
  useEffect(() => {
    const currentData = getFormData();
    const currentIsValid = validateForm();
    
    if (onChange) {
      onChange(currentData, currentIsValid);
    }
    
    setIsValid(currentIsValid);
  }, [formData, onChange]);

  function validateField(fieldName: string, value: any, rule?: ValidationRule): ValidationResult {
    if (!rule) {
      return { isValid: true, error: null };
    }

    const warnings: string[] = [];
    
    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return { isValid: false, error: `${fieldName} is required` };
    }

    // Skip other validations if value is empty and not required
    if (!value && !rule.required) {
      return { isValid: true, error: null, warnings };
    }

    // String validations
    if (typeof value === 'string') {
      const strValue = value.trim();
      
      // Length validations
      if (rule.minLength && strValue.length < rule.minLength) {
        return { 
          isValid: false, 
          error: `${fieldName} must be at least ${rule.minLength} characters` 
        };
      }
      
      if (rule.maxLength && strValue.length > rule.maxLength) {
        return { 
          isValid: false, 
          error: `${fieldName} must be no more than ${rule.maxLength} characters` 
        };
      }
      
      // Pattern validation
      if (rule.pattern && !rule.pattern.test(strValue)) {
        return { isValid: false, error: `${fieldName} format is invalid` };
      }
      
      // Email validation
      if (rule.email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(strValue)) {
          return { isValid: false, error: 'Please enter a valid email address' };
        }
      }
      
      // Phone validation
      if (rule.phone) {
        const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanPhone = strValue.replace(/[\s\-\(\)\.]/g, '');
        if (!phonePattern.test(cleanPhone) || cleanPhone.length < 10) {
          return { isValid: false, error: 'Please enter a valid phone number' };
        }
      }
      
      // URL validation
      if (rule.url) {
        try {
          new URL(strValue);
        } catch {
          return { isValid: false, error: 'Please enter a valid URL' };
        }
      }
      
      // Date validation
      if (rule.date) {
        const date = new Date(strValue);
        if (isNaN(date.getTime())) {
          return { isValid: false, error: 'Please enter a valid date' };
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (rule.futureDate) {
          const inputDate = new Date(strValue);
          inputDate.setHours(0, 0, 0, 0);
          if (inputDate <= today) {
            return { isValid: false, error: 'Date must be in the future' };
          }
        }
        
        if (rule.pastDate) {
          const inputDate = new Date(strValue);
          inputDate.setHours(0, 0, 0, 0);
          if (inputDate >= today) {
            return { isValid: false, error: 'Date must be in the past' };
          }
        }
      }
    }
    
    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return { 
          isValid: false, 
          error: `${fieldName} must be at least ${rule.min}` 
        };
      }
      
      if (rule.max !== undefined && value > rule.max) {
        return { 
          isValid: false, 
          error: `${fieldName} must be no more than ${rule.max}` 
        };
      }
    }
    
    // File validation
    if (value instanceof File || (Array.isArray(value) && value[0] instanceof File)) {
      const files = Array.isArray(value) ? value : [value];
      
      if (rule.file) {
        if (rule.file.maxFiles && files.length > rule.file.maxFiles) {
          return { 
            isValid: false, 
            error: `Maximum ${rule.file.maxFiles} files allowed` 
          };
        }
        
        for (const file of files) {
          if (rule.file!.maxSize && file.size > rule.file!.maxSize!) {
            return { 
              isValid: false, 
              error: `File size must be less than ${formatFileSize(rule.file!.maxSize!)}` 
            };
          }
          
          if (rule.file!.allowedTypes && !rule.file!.allowedTypes.includes(file.type)) {
            return { 
              isValid: false, 
              error: `File type not allowed. Allowed types: ${rule.file!.allowedTypes.join(', ')}` 
            };
          }
        }
      }
    }
    
    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        return { isValid: false, error: customError };
      }
    }
    
    return { isValid: true, error: null, warnings };
  }

  function validateForm(): boolean {
    return Object.values(formData).every(field => field.result.isValid);
  }

  function getFormData(): Record<string, any> {
    const data: Record<string, any> = {};
    
    Object.keys(formData).forEach(fieldName => {
      data[fieldName] = formData[fieldName].value;
    });
    
    return data;
  }

  function updateField(fieldName: string, value: any) {
    setFormData(prev => {
      const fieldValidation = validateField(fieldName, value, schema[fieldName]);
      
      return {
        ...prev,
        [fieldName]: {
          value,
          result: fieldValidation,
          touched: true,
          dirty: prev[fieldName]?.dirty || prev[fieldName]?.value !== value
        }
      };
    });
    
    // Mark field as touched
    setTouchedFields(prev => new Set([...prev, fieldName]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) {
      // Mark all fields as touched to show validation errors
      const allFields = new Set(Object.keys(formData));
      setTouchedFields(allFields);
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const data = getFormData();
      
      if (onSubmit) {
        await onSubmit(data);
      }
      
      if (showSuccessMessage) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
      
    } catch (error: any) {
      console.error('Form submission error:', error);
      setSubmitError(error.message || 'An error occurred while submitting the form');
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Render form with enhanced validation
  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit} 
      className={`space-y-6 ${className}`}
      noValidate
    >
      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-green-800 font-medium">Success!</p>
            <p className="text-green-700 text-sm">Form submitted successfully.</p>
          </div>
        </div>
      )}

      {/* Submit Error */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Submission Error</p>
            <p className="text-red-700 text-sm">{submitError}</p>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              ...child.props,
              updateField,
              validation: formData[child.props.name],
              touched: touchedFields.has(child.props.name),
              isValid: formData[child.props.name]?.result.isValid || false
            });
          }
          return child;
        })}
      </div>

      {/* Submit Button */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={disabled || !isValid || isSubmitting}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all duration-200 
            flex items-center gap-2 min-w-[120px] justify-center
            ${isValid && !disabled && !isSubmitting
              ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            submitText
          )}
        </button>

        {/* Form Validation Summary */}
        {!isValid && Object.keys(formData).length > 0 && (
          <div className="flex-1">
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Please fix {Object.values(formData).filter(f => !f.result.isValid).length} error(s) to continue
            </p>
          </div>
        )}
      </div>
    </form>
  );
};

// Enhanced Input Component with Validation
interface EnhancedInputProps {
  name: string;
  type?: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: any;
  updateField?: (name: string, value: any) => void;
  validation?: ValidationResult;
  touched?: boolean;
  className?: string;
  icon?: React.ReactNode;
  tooltip?: string;
  suggestions?: string[];
  autoComplete?: string;
  min?: number;
  max?: number;
  step?: number;
  multiple?: boolean;
  accept?: string;
}

export const EnhancedInput: React.FC<EnhancedInputProps> = ({
  name,
  type = 'text',
  label,
  placeholder,
  required = false,
  disabled = false,
  value = '',
  updateField,
  validation,
  touched = false,
  className = '',
  icon,
  tooltip,
  suggestions = [],
  autoComplete,
  min,
  max,
  step,
  multiple,
  accept
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputType = type === 'password' && showPassword ? 'text' : type;
  
  const hasError = validation && !validation.isValid && touched;
  const hasSuccess = validation && validation.isValid && touched && value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    updateField?.(name, newValue);
  };

  const handleBlur = () => {
    setShowSuggestions(false);
  };

  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes((value || '').toLowerCase())
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {tooltip && (
          <span className="ml-1 text-gray-400 cursor-help" title={tooltip}>
            ℹ️
          </span>
        )}
      </label>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon && <div className={`h-5 w-5 ${hasError ? 'text-red-400' : hasSuccess ? 'text-green-400' : 'text-gray-400'}`}>
            {icon}
          </div>}
        </div>
        
        <input
          type={inputType}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          min={min}
          max={max}
          step={step}
          multiple={multiple}
          accept={accept}
          className={`
            block w-full pl-10 pr-12 py-3 border rounded-lg text-sm
            transition-colors duration-200
            ${hasError 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : hasSuccess
                ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            ${icon ? 'pl-10' : 'pl-3'}
            ${type === 'password' ? 'pr-12' : 'pr-3'}
          `}
        />
        
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        )}
        
        {hasSuccess && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400" />
          </div>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && filteredSuggestions.length > 0 && showSuggestions && value && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                updateField?.(name, suggestion);
                setShowSuggestions(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Error Message */}
      {hasError && (
        <div className="flex items-center gap-1 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{validation.error}</span>
        </div>
      )}

      {/* Warnings */}
      {validation?.warnings && validation.warnings.length > 0 && (
        <div className="space-y-1">
          {validation.warnings.map((warning, index) => (
            <div key={index} className="flex items-center gap-1 text-yellow-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Enhanced Textarea Component with Validation
interface EnhancedTextareaProps {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: any;
  updateField?: (name: string, value: any) => void;
  validation?: ValidationResult;
  touched?: boolean;
  className?: string;
  rows?: number;
  maxLength?: number;
  showCharCount?: boolean;
}

export const EnhancedTextarea: React.FC<EnhancedTextareaProps> = ({
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
  value = '',
  updateField,
  validation,
  touched = false,
  className = '',
  rows = 4,
  maxLength,
  showCharCount = false
}) => {
  const hasError = validation && !validation.isValid && touched;
  const hasSuccess = validation && validation.isValid && touched && value;
  const charCount = typeof value === 'string' ? value.length : 0;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateField?.(name, e.target.value);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <textarea
          name={name}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          className={`
            block w-full px-3 py-3 border rounded-lg text-sm resize-vertical
            transition-colors duration-200
            ${hasError 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : hasSuccess
                ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          `}
        />
        
        {hasSuccess && (
          <div className="absolute top-3 right-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
          </div>
        )}
      </div>

      {/* Character Count */}
      {showCharCount && maxLength && (
        <div className={`text-right text-xs ${charCount > maxLength * 0.9 ? 'text-red-500' : 'text-gray-500'}`}>
          {charCount} / {maxLength}
        </div>
      )}

      {/* Error Message */}
      {hasError && (
        <div className="flex items-center gap-1 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{validation.error}</span>
        </div>
      )}
    </div>
  );
};

export default EnhancedFormValidation;