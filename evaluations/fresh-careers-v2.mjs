// Fictional development holdout. Freeze before generation; never edit after first use.
const rows = [
  ['F01','Owen Mercer','CNC Machine Operator','Example Precision Parts','Full-time',[
    'CNC Machine Operator | Example Alloy Works | 2022 - 2026',
    'Loaded aluminium blanks into CNC milling machines and ran approved programmes for small production batches.',
    'Measured first-off parts with digital calipers and recorded dimensions against the drawing; the setup technician approved offsets and programme changes.',
    'Worked with another operator on a cell producing 180 brackets per shift in total across both operators.',
    'Production Assistant | Example Alloy Works | 2020 - 2022',
    'Deburred machined edges, labelled completed batches and separated nonconforming parts for inspection.',
    'Education','Mechanical Techniques certificate | Example Technical College | 2020',
    'Skills','CNC operation; digital calipers; drawing dimensions; batch traceability'
  ],['Experience operating CNC milling machines','Ability to measure parts against engineering drawings'],['Run approved machining programmes and record first-off measurements','Identify out-of-tolerance parts and escalate setup changes','Maintain batch labels and shift handover notes']],
  ['F02','Clara Voss','Hand Bookbinder','Example Bound Editions','Contract',[
    'Bookbinding Assistant | Example Paper Studio | 2023 - 2026',
    'Folded and gathered printed signatures, sewed text blocks and fitted cloth covers for short-run journals.',
    'Made a sample binding for each customer order and recorded the approved cloth, endpaper and spine lettering before production.',
    'Checked finished journals for loose threads and uneven trimming, referring damaged printed pages to the studio owner.',
    'Library Volunteer | Example Reading Room | 2021 - 2023',
    'Made protective paper covers and recorded damaged books for librarian review.',
    'Training','Hand bookbinding workshop | Example Paper Arts Centre | 2023',
    'Skills','Signature sewing; case binding; cloth covering; sample approval records'
  ],['Practical experience with sewn and case-bound books','Ability to follow an approved binding sample'],['Assemble text blocks and fit covers for small editions','Record material choices and check finished bindings','Flag damaged pages before completing an order']],
  ['F03','Malik Adebayo','Audiovisual Event Technician','Example Stage Services','Casual',[
    'Audiovisual Assistant | Example Civic Events | 2022 - 2026',
    'Set up wired microphones, powered speakers and presentation laptops for panel discussions in two meeting rooms.',
    'Checked each presenter’s slides and audio during rehearsal and labelled backup cables at the technical desk.',
    'Operated the sound mixer during sessions under the lead technician’s direction and logged faults for the equipment team.',
    'Event Volunteer | Example Community Forum | 2020 - 2022',
    'Placed directional signs and guided speakers to the rehearsal room.',
    'Training','Working at Heights training | Example Safety School | expired June 2025',
    'Skills','Microphone setup; basic audio mixing; presentation playback; cable labelling'
  ],['Experience setting up microphones and presentation equipment','Ability to troubleshoot playback during rehearsals','Availability for evening and weekend events'],['Prepare room audio and test presenter material','Operate event sound under the lead technician’s direction','Record equipment faults and support pack-down']],
  ['F04','Elena Rossi','Travel Reservations Agent','Example Journey Desk','Full-time',[
    'Reservations Assistant | Example Lakeside Tours | 2023 - 2026',
    'Entered coach-tour reservations, checked traveller names against booking forms and emailed supplier confirmations.',
    'Compared requested dates with the operator’s published cancellation terms and referred exceptions to a senior agent.',
    'Recorded accessibility requests and asked suppliers to confirm arrangements before promising them to customers.',
    'Guest Services Assistant | Example Harbour Lodge | 2021 - 2023',
    'Updated room bookings and prepared arrival lists for reception colleagues.',
    'Education','Tourism Operations diploma | Example Regional College | 2021',
    'Languages','English: Fluent','Italian: Fluent',
    'Skills','Reservation records; supplier confirmations; booking amendments; customer email'
  ],['Travel or accommodation reservation experience','Accurate customer and supplier communication'],['Maintain bookings and communicate supplier confirmations','Explain published booking terms and escalate exceptions','Track accessibility arrangements without assuming supplier approval']],
  ['F05','Benji Patel','Insurance Claims Assistant','Example Claims Support','Full-time',[
    'Claims Administration Assistant | Example Mutual Services | 2022 - 2026',
    'Opened motor-claim files, checked forms for missing information and requested photographs listed on the adjuster’s checklist.',
    'Recorded repair-estimate documents and routed customer questions about coverage or settlement to the assigned adjuster.',
    'Maintained a shared follow-up queue for approximately 45 active files; the queue belonged to a three-person administration team.',
    'Records Clerk | Example Document Bureau | 2020 - 2022',
    'Indexed scanned correspondence and checked document dates against the file register.',
    'Education','Business Administration diploma | Example Metro College | 2020',
    'Training','Introduction to Insurance course | Example Continuing Education | in progress, expected November 2026',
    'Skills','Claim-file administration; document indexing; follow-up queues; missing-information checks'
  ],['Experience maintaining customer case files','Ability to handle records accurately and escalate specialist decisions'],['Check intake documents and request listed missing items','Maintain follow-up records for adjusters','Refer coverage and settlement decisions to authorized staff']],
  ['F06','Tessa Morgan','Recycling Sort Line Operator','Example Material Recovery','Full-time',[
    'Recycling Sorter | Example Recovery Depot | 2024 - 2026',
    'Removed plastic film and other listed contaminants from a mixed-paper sorting belt using the site’s material guide.',
    'Stopped work and notified the line supervisor when batteries or sharp objects appeared; did not handle unidentified hazardous items.',
    'Recorded repeated contamination types on the shift checklist and cleaned the work station after the line was isolated by authorized staff.',
    'Skills','Material identification; sorting-line checklists; hazard escalation; workstation housekeeping'
  ],['Experience sorting recyclable materials','Ability to follow site safety and escalation procedures'],['Sort material against the accepted-items guide','Report batteries, sharps and unknown materials','Record recurring contamination and complete safe cleanup']],
  ['F07','Isaac Reed','Funeral Service Assistant','Example Remembrance Services','Part-time',[
    'Service Attendant | Example Memorial House | 2023 - 2026',
    'Prepared seating, displayed family-approved photographs and checked printed service programmes against the coordinator’s final copy.',
    'Welcomed visitors, directed them to the service room and passed requests from family members to the funeral director.',
    'Logged returned keepsakes and arranged collection times with families using instructions approved by the service coordinator.',
    'Hospitality Assistant | Example Civic Hall | 2020 - 2023',
    'Prepared meeting rooms and assisted guests with arrival information.',
    'Training','Bereavement Communication workshop | Example Community Learning | 2024',
    'Skills','Service-room preparation; guest assistance; programme checking; keepsake records'
  ],['Experience supporting sensitive customer-facing services','Attention to detail when preparing events'],['Prepare service rooms using approved family instructions','Welcome visitors and escalate family requests to the director','Keep accurate records of returned personal items']],
  ['F08','Yuki Tanaka','Localization QA Tester','Example Language Games','Fixed-term',[
    'Localization QA Tester | Example Pixel Workshop | 2023 - 2026',
    'Tested Japanese interface text in pre-release game builds and logged clipped labels, inconsistent terminology and untranslated strings in Jira.',
    'Attached screenshots, build numbers and reproduction steps to each issue; the localization lead approved wording changes.',
    'Retested assigned issues after updated builds and reopened reports when the displayed text still differed from the approved glossary.',
    'Education','Digital Media diploma | Example Media Institute | 2023',
    'Languages','Japanese: Native','English: Fluent',
    'Skills','Localization QA; Jira; screenshot annotation; glossary checks; regression testing'
  ],['Japanese fluency','Experience documenting reproducible software or localization defects'],['Test localized screens against a supplied glossary','Write reproducible defect reports with screenshots and build details','Retest fixes and refer wording decisions to the localization lead']],
  ['F09','Sophie Diallo','Freelance Floral Designer','Example Celebration Flowers','Freelance',[
    'Freelance Floral Designer | Self-employed | 2022 - 2026',
    'Prepared bouquets and table arrangements from client-approved colour palettes, flower lists and spending limits.',
    'For one wedding, prepared 12 table arrangements with a freelance assistant; this quantity was the combined output.',
    'Checked stem condition on delivery and confirmed substitutions with the client before changing the agreed flower list.',
    'Retail Florist Assistant | Example Bloom Shop | 2020 - 2022',
    'Conditioned cut flowers, wrapped bouquets and recorded collection times.',
    'Training','Floral Design certificate | Example Design School | 2022',
    'Portfolio','https://example.com/sophie-flowers',
    'Selected Projects','Courtyard Wedding | Independent client | 2025',
    'Designed low table arrangements to preserve guests’ sightlines, using the client’s approved cream-and-green palette.',
    'Skills','Floral conditioning; client approvals; table arrangements; substitution planning'
  ],['Portfolio of floral arrangements','Experience working to client-approved designs and spending limits'],['Prepare event arrangements from agreed palettes and flower lists','Confirm substitutions before changing the design','Coordinate arrangement quantities and collection details']],
  ['F10','Arthur Quinn','Theatre Wardrobe Assistant','Example Repertory Stage','Fixed-term',[
    'Wardrobe Assistant | Example Little Theatre | 2022 - 2026',
    'Prepared labelled costume rails from the wardrobe supervisor’s plot and checked fastenings before each performance.',
    'Assisted performers with quick changes using rehearsed cues and recorded repairs needed after the show.',
    'Hand-sewed replacement buttons and repaired loose hems within the supervisor’s instructions; design alterations required the supervisor’s approval.',
    'Student Costume Volunteer | Example College Players | 2020 - 2022',
    'Sorted donated garments by size and prepared a costume inventory for a student production.',
    'Education','Fashion Techniques diploma | Example Arts College | 2022',
    'Skills','Costume plots; quick-change assistance; hand sewing; repair logs'
  ],['Practical costume or garment-care experience','Ability to follow performance cues and wardrobe instructions'],['Prepare costume rails and inspect fastenings','Assist with rehearsed quick changes','Complete minor repairs and escalate design changes']]
];

export const freshCareerCases = rows.map(([id,name,title,company,employment,history,required,responsibilities]) => ({
  id,name,title,voice:'direct',length:'standard',
  resume:[name,`${id.toLowerCase()}.v2@example.com | Hamilton, Ontario`,...history].join('\n'),
  posting:[`${title} — ${company}`,'Location: Hamilton, Ontario',`Employment type: ${employment}`,`About the role: ${company} seeks a ${title.toLowerCase()} to support the work described below.`,'Responsibilities',...responsibilities.map(x=>`- ${x}`),'Required qualifications',...required.map(x=>`- ${x}`),'How to apply: Submit a résumé and a short cover letter describing relevant work.'].join('\n')
}));
