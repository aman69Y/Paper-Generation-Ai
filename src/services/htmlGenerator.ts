import { QuestionPaper } from './geminiService';

export const generatePaperHTML = (paper: QuestionPaper) => {
  let html = `
    <div style="font-family: 'Inter', sans-serif; font-size: 14px; color: #000; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="text-align: center; font-size: 24px; text-transform: uppercase; margin-bottom: 5px;">${paper.config.board}</h1>
      <h2 style="text-align: center; font-size: 18px; margin-top: 0; margin-bottom: 20px;">${paper.config.subject} - Class ${paper.config.classLevel}</h2>
      
      <table style="width: 100%; border-top: 2px solid #000; border-bottom: 2px solid #000; margin-bottom: 20px; font-weight: bold;">
        <tr>
          <td style="text-align: left; padding: 8px 0;">Time: ${paper.config.timeDuration}</td>
          <td style="text-align: right; padding: 8px 0;">Max Marks: ${paper.config.totalMarks}</td>
        </tr>
      </table>

      <div style="margin-bottom: 20px;">
        <strong style="font-size: 16px;">General Instructions:</strong>
        <ul style="margin-top: 5px; padding-left: 20px;">
          <li>All questions are compulsory.</li>
          <li>The question paper consists of various sections based on question types.</li>
          <li>Marks are indicated against each question.</li>
        </ul>
      </div>
  `;

  paper.questions.forEach((q, idx) => {
    html += `
      <div style="margin-bottom: 24px; page-break-inside: avoid;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top; width: 30px; font-weight: bold;">Q${idx + 1}.</td>
            <td style="vertical-align: top;">
              <div style="margin-bottom: 10px;">${q.question}</div>
              ${q.imageUrl ? `<div style="margin-bottom: 10px;"><img src="${q.imageUrl}" style="max-width: 100%; height: auto; max-height: 300px; display: block;" /></div>` : ''}
              ${q.options && q.options.length > 0 ? `
                <ol type="a" style="margin-top: 0; padding-left: 20px;">
                  ${q.options.map(opt => `<li style="margin-bottom: 5px;">${opt}</li>`).join('')}
                </ol>
              ` : ''}
              ${q.type === 'True/False' ? `<div style="margin-top: 10px;">( ) True &nbsp;&nbsp;&nbsp;&nbsp; ( ) False</div>` : ''}
            </td>
            <td style="vertical-align: top; text-align: right; width: 50px; font-weight: bold;">[${q.marks}]</td>
          </tr>
        </table>
      </div>
    `;
  });

  html += `
      <div style="page-break-before: always; margin-top: 40px;">
        <h2 style="text-align: center; font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">Answer Key & Marking Scheme</h2>
  `;

  paper.questions.forEach((q, idx) => {
    html += `
        <div style="margin-bottom: 15px; page-break-inside: avoid;">
          <strong>Q${idx + 1}.</strong> 
          <div style="margin-top: 5px; padding-left: 25px;">${q.answer}</div>
        </div>
    `;
  });

  html += `
      </div>
    </div>
  `;
  return html;
};
