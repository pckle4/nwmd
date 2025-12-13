export const SAMPLE_MARKDOWN = `# Complete Markdown Demo 📄

## Text Formatting
**Bold text**, *italic text*, ***bold and italic***, ~~strikethrough~~.
We can also highlight inline code like this: \`const x = 42;\`.

## Code Blocks (Syntax Highlighting)

\`\`\`javascript
/**
 * Generates a PDF from HTML content
 * @param {string} html - The parsed HTML
 */
async function generatePDF(html) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  return page.pdf({ format: 'A4' });
}
\`\`\`

## Lists & Hierarchy

1. Backend Requirements
   - [x] Node.js Environment
   - [x] Puppeteer Core
2. Frontend Features
   - Live Preview
   - Error Handling

## Data Tables
| Feature | Status | Priority |
|:--------|:------:|---------:|
| Emojis  | ✅     | High     |
| Tables  | ✅     | Medium   |
| Styles  | 🎨     | Low      |

## Blockquotes
> "Efficiency is intelligent laziness."
>
> — *David Dunham*

## Media & Extras
Horizontal Rule:

---

Generated on: ${new Date().toLocaleDateString()}
`;

export const TEMPLATES = {
  resume: `# [Your Name]
**Software Engineer**
*email@example.com | (555) 123-4567 | github.com/username*

---

## 💼 Experience

### **Senior Developer** | Tech Corp
*Jan 2020 - Present*
- Led migration to **Next.js**, improving load times by 40%.
- Mentored 5 junior developers.

### **Web Developer** | Startup Inc
*Jun 2018 - Dec 2019*
- Built responsive UI components using React.

## 🛠 Skills
- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend:** Node.js, PostgreSQL
- **Tools:** Git, Docker, AWS

## 🎓 Education
**B.S. Computer Science** | University of Technology
*2014 - 2018*
`,
  letter: `# [Your Name]
*[Your Address] | [City, State Zip]*
*[Email] | [Phone]*

${new Date().toLocaleDateString()}

**Hiring Manager**
*Company Name*
*123 Business Rd*
*City, State 12345*

Dear Hiring Manager,

I am writing to express my strong interest in the **Software Engineer** position at **Company Name**. With over 5 years of experience in full-stack development, I believe I can make a significant contribution to your team.

I successfully led the development of [Key Project], which resulted in [Result]. I am particularly drawn to your company's commitment to [Company Value].

Thank you for your time and consideration. I look forward to the possibility of discussing my application with you.

Sincerely,

[Your Name]
`,
  invoice: `# INVOICE

**Invoice #:** 001
**Date:** ${new Date().toLocaleDateString()}
**Due Date:** ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}

---

### **Bill To:**
Client Name
123 Client Street
City, State, Zip

### **Pay To:**
Your Company Name
123 Business Rd
City, State, Zip

---

| Description | Quantity | Rate | Amount |
|:------------|:--------:|:----:|-------:|
| Web Development | 10 hrs | $100 | $1,000 |
| Consulting | 5 hrs | $150 | $750 |
| **Total** | | | **$1,750** |

---

*Thank you for your business!*
`
};