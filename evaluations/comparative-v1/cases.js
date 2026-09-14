// Fictional, frozen before the first provider request. No real candidate data.
const make = (id, name, title, category, resume, responsibilities, required, selected) => ({
  id, name, resume: `${name}\n${id.toLowerCase()}@example.com | Hamilton, Ontario\n${resume}`,
  job: { title, company: `Example ${id} Services`, location: 'Hamilton, Ontario', type: 'Full-time', category,
    description: `We need a ${title} to carry out the responsibilities listed below. Submit a résumé and cover letter describing relevant work.`,
    responsibilities, required_qualifications: required, preferred_qualifications: [], source: 'candidate_reviewed' },
  selected,
});
export const comparisonCases = [
  make('C01', 'Elena Cruz', 'SAP Migration Workstream Lead', 'tech',
`Solution Architect | Example Systems Canada | 2022 - 2026
Led a four-person master-data team through UAT, mock cutover and defect triage for a public-sector SAP S/4HANA rollout.
Integrated SAP S/4HANA with SAP MDG and coordinated interface testing with the integration team.
The project manager owned budget, staffing approvals and steering reporting.
Senior Consultant | Example Banking Partners | 2015 - 2022
Prepared SAP banking functional designs and coordinated testing with business users.
Selected Project
Mock Cutover Reconciliation | Example Systems Canada | 2025
When duplicate customer records blocked a mock load, grouped the exceptions by source system, assigned owners and agreed retest criteria with business data stewards; the next mock load cleared those recorded exceptions.
Education
Bachelor of Business Administration | Example College | 2014
Skills
SAP S/4HANA; SAP MDG; UAT; defect triage; master-data reconciliation`,
    ['Lead a master-data migration workstream through testing and cutover', 'Coordinate business data owners and interface teams', 'Report risks to the project manager'],
    ['SAP S/4HANA delivery experience', 'Team coordination and migration testing experience'],
    ['Led a four-person master-data team through UAT, mock cutover and defect triage for a public-sector SAP S/4HANA rollout.', 'When duplicate customer records blocked a mock load, grouped the exceptions by source system, assigned owners and agreed retest criteria with business data stewards; the next mock load cleared those recorded exceptions.']),
  make('C02', 'Amir Chen', 'Staff Accountant', 'finance',
`Accounting Assistant | Example Parts Distribution | 2021 - 2026
Prepared bank reconciliations for six operating accounts and submitted reconciling items to the controller before month-end review.
Matched supplier invoices to purchase orders in QuickBooks and maintained the fixed-asset additions register.
Month-end Improvement | Example Parts Distribution | 2025
Found duplicate bank-feed entries behind recurring reconciliation differences, documented the import steps and tested the revised checklist with the controller. Unresolved differences fell from 18 to 5 across the next three monthly reviews; the controller approved final adjustments.
Accounts Payable Clerk | Example Office Supply | 2019 - 2021
Checked invoice coding and followed up missing supplier approvals.
Education
Accounting diploma | Example Business College | 2019
Training
CPA preparatory courses in progress; no CPA designation held.
Skills
QuickBooks; Excel pivot tables; bank reconciliations; accounts payable`,
    ['Prepare bank reconciliations and month-end schedules', 'Investigate reconciling differences and document corrections', 'Maintain fixed-asset records'],
    ['Accounting education', 'Hands-on reconciliation and spreadsheet experience'],
    ['Prepared bank reconciliations for six operating accounts and submitted reconciling items to the controller before month-end review.', 'Found duplicate bank-feed entries behind recurring reconciliation differences, documented the import steps and tested the revised checklist with the controller. Unresolved differences fell from 18 to 5 across the next three monthly reviews; the controller approved final adjustments.']),
  make('C03', 'Riley Morgan', 'Plumbing Apprentice', 'trades',
`Plumbing Apprentice | Example Home Plumbing | 2023 - 2026
Assisted a licensed plumber with residential water-line repairs, fixture replacement and drain clearing.
Measured and cut copper and PEX pipe from the supervising plumber's marked layout, prepared joints and recorded materials on work orders.
Located a recurring under-sink leak during a supervised pressure check by drying the fittings and checking each joint in sequence; the plumber approved and completed the connection repair.
Warehouse Associate | Example Building Supply | 2021 - 2023
Picked plumbing fittings against order lists and checked part sizes before loading.
Education
Plumbing Techniques certificate | Example Trades College | 2023
Training
Working at Heights certificate expired in 2025.
Skills
Copper and PEX preparation; fixture assistance; material records; supervised leak checks`,
    ['Assist licensed plumbers with residential repairs', 'Prepare pipe and fittings from marked layouts', 'Record work and materials'],
    ['Plumbing workshop or field experience', 'Ability to work under licensed supervision'],
    ["Measured and cut copper and PEX pipe from the supervising plumber's marked layout, prepared joints and recorded materials on work orders.", 'Located a recurring under-sink leak during a supervised pressure check by drying the fittings and checking each joint in sequence; the plumber approved and completed the connection repair.']),
  make('C04', 'Nadia Brooks', 'Client Onboarding Coordinator', 'admin',
`Front Desk Supervisor | Example Community Recreation | 2020 - 2026
Scheduled a five-person reception team, handled membership questions and maintained registration records.
Coordinated the move from paper waivers to online registration: mapped missing fields with the programme manager, wrote a desk checklist and coached reception staff through the first registration week.
Kept a daily exceptions sheet for families unable to complete online forms and arranged a callback with the programme lead; the team resolved 32 outstanding registrations during that week.
Retail Assistant | Example Outdoor Shop | 2018 - 2020
Explained product options and processed returns within store policy.
Education
Business Administration diploma | Example City College | 2018
Skills
Scheduling; registration records; Excel; customer callbacks; staff coaching`,
    ['Guide new business clients through account setup', 'Track incomplete onboarding information and coordinate follow-up', 'Maintain clear handover notes for account managers'],
    ['Customer coordination experience', 'Accurate records and clear written instructions'],
    ['Coordinated the move from paper waivers to online registration: mapped missing fields with the programme manager, wrote a desk checklist and coached reception staff through the first registration week.', 'Kept a daily exceptions sheet for families unable to complete online forms and arranged a callback with the programme lead; the team resolved 32 outstanding registrations during that week.']),
  make('C05', 'Theo Park', 'Junior Data Analyst', 'tech',
`Retail Assistant | Example Corner Market | 2023 - 2026
Checked shelf prices against the till file and reported discrepancies to the shift manager.
Education
Data Analytics diploma | Example Technical College | 2026
Academic Project
Transit Delay Dashboard | Example Technical College | 2026
In a three-student course project, cleaned a public transit dataset in Python and identified duplicate journey identifiers before joining the route tables.
Built the team's Power BI view comparing median delay by route and weekday; the report excluded cancelled trips and stated that limitation beside the chart.
Presented the cleaning decisions to the class. The dashboard was coursework and was not deployed by a transit agency.
Skills
Python pandas; SQL joins; Power BI; data-quality checks`,
    ['Clean operational datasets and document limitations', 'Build clear Power BI reports', 'Explain analysis decisions to colleagues'],
    ['Training or project experience with SQL and Python', 'Power BI familiarity'],
    ["In a three-student course project, cleaned a public transit dataset in Python and identified duplicate journey identifiers before joining the route tables.", "Built the team's Power BI view comparing median delay by route and weekday; the report excluded cancelled trips and stated that limitation beside the chart."]),
  make('C06', 'Sofia Adeyemi', 'Freelance Interior Photo Editor', 'design',
`Freelance Photo Editor | Self-employed | 2022 - 2026
Edited residential interiors in Lightroom from photographers' files and colour-reference notes.
Corrected white balance and vertical alignment without removing permanent room features.
Delivered named image sets with the requested dimensions and checked them against the photographer's shot list.
Selected Project
Riverside Apartment Series | Example Interior Photographer | 2025
Matched colour across adjoining rooms with mixed window and ceiling light, using the photographer's reference frame and local white-balance masks. The photographer accepted the set after one review round.
Event Photo Assistant | Example Studio | 2020 - 2022
Labelled memory cards, prepared equipment and organised contact sheets.
Portfolio
https://example.com/sofia-interiors
Skills
Lightroom; white balance; perspective corrections; export checks`,
    ['Match colour across interior image sets with mixed lighting', 'Preserve property features and meet delivery specifications', 'Provide an interior-editing portfolio'],
    ['Lightroom interior editing experience', 'Portfolio demonstrating consistent colour'],
    ["Matched colour across adjoining rooms with mixed window and ceiling light, using the photographer's reference frame and local white-balance masks. The photographer accepted the set after one review round.", "Delivered named image sets with the requested dimensions and checked them against the photographer's shot list."]),
];
export const comparisonArms = ['pipeline', 'simple', 'reasoning', 'selection'];
// Cyclic, balanced order fixed before generation. Two documents per cell.
export const comparisonQueue = comparisonCases.flatMap((c, index) => comparisonArms
  .map((_, offset) => comparisonArms[(index + offset) % 4])
  .flatMap(arm => ['resume', 'letter'].map(kind => ({ caseId: c.id, arm, kind }))));
