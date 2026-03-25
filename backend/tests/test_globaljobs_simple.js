/**
 * Simple debug script for globaljobs.org AI parsing issue
 * Tests with a smaller sample of cleaned text
 */

const { parseJobListings } = require('../services/aiService');

// Sample of cleaned text from globaljobs.org
const sampleText = `
Find Jobs build a better career. International, non-profit, ngo, government, and development jobs
Jobs Post a Job Digital Events Contact FAQ Post a job ($300) Login Register ×
Jobs Post a Job Digital Events Contact FAQ Login Register Post a Job
Jobs for Global Professionals NGOs, Think Tanks, Government, Private Sector
Search Filters & Refine Region North America Europe Asia Pacific South America Africa
Experience Internship Early Career Mid Career Advanced Sector Non Profit Education Government Commercial
Location New York Washington D.C. Brussels Location Type Onsite Remote Hybrid

Policy Development Coordinator State of Connecticut - Office of Policy and Management North America Yesterday Hartford, Connecticut
Lobbying Internship in MFF Context European Photonics Industry Consortium Europe Yesterday Brussels, Belgium
Professor of Global Public Policy and Director of the Pardee Center for the Study of the Longer-Range Future, Pardee School of Global Studies Boston University North America Yesterday Boston, Massachusetts
Public Affairs Planner CACI North America Yesterday Macdill AFB, Florida
First Nations Adviser Tetra Tech Asia Pacific Yesterday Multiple Asian Countries, Indonesia
Mission Accountant (Outside of the country) Ministry of Foreign Affairs- UAE North America Yesterday Washington, D.C.
Deputy Executive Director News Media Guild North America Yesterday New York, New York
Targeting Officer - Active Security Clearance CADRE North America Yesterday Alexandria, Virginia
Associate, Strategic Communications - EU Institutions Global Strategic Communications Council Europe Yesterday Brussels, Belgium Hybrid
International Programs Advisor Inside Higher Ed North America Yesterday Los Angeles, California
Senior EU Policy & Advocacy Consultant Valìa Europe Yesterday Brussels, Belgium
Director of Government Affairs (International) Cato Institute North America Yesterday Washington, D.C.
Director, International Market Management (Sub-Saharan Africa; Europe; UK) NAFSA: Association of International Educators North America Yesterday Washington, D.C.
Contracting Officer Central Intelligence Agency North America Yesterday Washington, D.C.
Chief Executive Officer – WV Mongolia World Vision International Asia Pacific Yesterday Ulaanbaatar, Mongolia
Medical Advisor: Tropical & Infectious Diseases; Climate, Environment & Health Médecins Sans Frontières Europe Yesterday Geneva, Switzerland
Policy & Insights Lead evergreen-intelligence North America Yesterday Remote, California
Institutional Relations Officer Brennan Center for Justice North America Mar 23 New York, New York
Program Officer- Domestic Climate Resilience Initiatives Episcopal Relief & Development North America Mar 23 Remote, Illinois Remote
`;

async function testSimpleParsing() {
    console.log('=== TESTING SIMPLE AI PARSING ===\n');
    console.log(`Sample text length: ${sampleText.length}\n`);

    try {
        const jobs = await parseJobListings(sampleText);
        console.log(`Jobs found: ${jobs.length}`);

        if (jobs.length > 0) {
            console.log('\nFirst few jobs:');
            jobs.slice(0, 5).forEach((job, i) => {
                console.log(`\nJob ${i + 1}:`);
                console.log(JSON.stringify(job, null, 2));
            });
        } else {
            console.log('\nNo jobs found. The AI returned an empty response.');
        }
    } catch (err) {
        console.error('Parsing failed:', err.message);
    }

    console.log('\n=== TEST COMPLETE ===');
}

testSimpleParsing().catch(console.error);
