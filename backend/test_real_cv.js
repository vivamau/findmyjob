const { parseCvWithModel } = require('./services/aiService');

async function test() {
    const cvText = `MAURIZIO BLASILLI 
Profile 
International ICT practitioner with over 20 years of experience in the 
humanitarian context.
Professional Experience 
WFP, Rome HQ and Field Duty Stations 
Head of Global Software Solutions Development and Deployment, Rome.  
2022 - Present 
Lead, coordinate, and review activities.
Head of Field Software Solutions Development and Deployment, Nairobi. 
2018 - 2022 
Manage a team of 10 staff.
WFP, Head of Software Development, Rome. 
2012 - 2018 
Led adoption of Agile methodology.
Università Roma Tre, Software Developer 
Software Engineering Department. 
1998 - 2006 
Coordinated university’s websites development.`;

    try {
        console.log("Parsing REAL CV containing multiple experiences...");
        const result = await parseCvWithModel(cvText, 'qwen3.5:9b');
        console.log("=== FINAL RESULT ===");
        console.log(result);
    } catch (err) {
        console.error("Test Error:", err.message);
    }
}

test();
