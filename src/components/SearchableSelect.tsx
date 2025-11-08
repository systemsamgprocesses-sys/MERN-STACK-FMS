
import React from 'react';
import Select from 'react-select';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isDisabled?: boolean;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  isDisabled = false,
  className = ''
}) => {
  const selectedOption = options.find(opt => opt.value === value) || null;

  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: 'var(--color-surface)',
      borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
      boxShadow: state.isFocused ? '0 0 0 1px var(--color-primary)' : 'none',
      '&:hover': {
        borderColor: 'var(--color-primary)'
      }
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: 'var(--color-surface)',
      zIndex: 9999
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? 'var(--color-primary)' 
        : state.isFocused 
        ? 'var(--color-primary)20' 
        : 'var(--color-surface)',
      color: state.isSelected ? 'white' : 'var(--color-text)',
      '&:hover': {
        backgroundColor: state.isSelected ? 'var(--color-primary)' : 'var(--color-primary)20'
      }
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: 'var(--color-text)'
    }),
    input: (provided: any) => ({
      ...provided,
      color: 'var(--color-text)'
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: 'var(--color-textSecondary)'
    })
  };

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={(option) => onChange(option?.value || '')}
      placeholder={placeholder}
      isDisabled={isDisabled}
      className={className}
      styles={customStyles}
      isSearchable
      isClearable
    />
  );
};

export default SearchableSelect;
