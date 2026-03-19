// @ts-ignore
import html2pdf from 'html2pdf.js';

export const downloadHTMLAsPDF = async (htmlContent: string, filename: string) => {
  const element = document.createElement('div');
  element.innerHTML = htmlContent;
  
  const opt = {
    margin:       10,
    filename:     filename,
    image:        { type: 'jpeg' as const, quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
    pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
  };

  html2pdf().set(opt).from(element).save();
};
