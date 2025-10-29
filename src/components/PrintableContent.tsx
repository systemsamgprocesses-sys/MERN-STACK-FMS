import React from 'react';

interface PrintableContentProps {
  title: string;
  subtitle?: string;
  logoPath?: string;
  children: React.ReactNode;
  footerText?: string;
}

export const PrintableContent: React.FC<PrintableContentProps> = ({
  title,
  subtitle,
  logoPath = '/assets/AMG LOGO.webp',
  children,
  footerText = `Printed on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'numeric', year: 'numeric' })}`
}) => {
  return (
    <div className="print-container">
      <div className="print-header">
        <div className="flex items-center gap-4">
          <img src={logoPath} alt="Logo" className="print-logo" />
          <div>
            <h1 className="print-title">{title}</h1>
            {subtitle && <p className="print-subtitle">{subtitle}</p>}
          </div>
        </div>
      </div>

      <div className="print-section">
        {children}
      </div>

      <div className="print-footer">
        <p>{footerText}</p>
        <p>© 2024 Ashok Malhotra Group. All rights reserved.</p>
      </div>
    </div>
  );
};

export default PrintableContent;
