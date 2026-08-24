export const verifiedPostingReview = Object.freeze({
  application_ready: true,
  posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
  readiness: { status: "strong_fit" },
  integrity: { status: "pass" },
  writing: { status: "pass" },
  export_readiness: { status: "ready", application_ready: true },
});

export const technicalSoftwareResumeFixture = Object.freeze({
  name: "Jordan Patel",
  title: "Senior Software Engineer",
  contact: "jordan.patel@example.com | 416-555-0182 | Toronto, Ontario | https://github.com/jordan-patel",
  profile: "Software engineer with verified full-stack development, API implementation, test automation, cloud infrastructure, and production support experience.",
  skills: {
    verifiedCore: ["JavaScript", "TypeScript", "Python", "SQL"],
    verifiedDomain: ["Full-stack development", "API implementation", "Data pipelines", "Test automation"],
    verifiedTools: ["React", "Node.js", "PostgreSQL", "AWS", "Docker", "Git"],
  },
  projects: [{
    name: "Service Reliability Dashboard",
    organization: "Example Engineering",
    startDate: "2023",
    endDate: "2024",
    description: "Built an internal React and Node.js application that consolidated verified service-health and deployment data for engineering support.",
    bullets: [
      "Implemented authenticated API endpoints and PostgreSQL queries for deployment and incident records.",
      "Added automated integration tests and release checks for the documented support workflows.",
    ],
  }, {
    name: "Customer Data Pipeline",
    organization: "Example Platforms",
    startDate: "2021",
    endDate: "2022",
    description: "Developed a Python data pipeline that normalized customer events for an existing analytics platform.",
    bullets: [
      "Documented field mappings, validation rules, retry behavior, and operational handoff procedures.",
      "Added monitoring for failed jobs and collaborated with analysts on verified data-quality checks.",
    ],
  }],
  experience: [{
    role: "Senior Software Engineer",
    company: "Example Engineering",
    dates: "2022 - Present",
    bullets: [
      "Developed React and TypeScript workflows for a customer-facing service administration platform.",
      "Implemented Node.js API changes and PostgreSQL migrations from reviewed product requirements.",
      "Maintained automated tests, code reviews, release notes, and production-support runbooks.",
      "Collaborated with product, design, security, and support partners during scoped feature delivery.",
    ],
  }, {
    role: "Software Engineer",
    company: "Example Platforms",
    dates: "2019 - 2022",
    bullets: [
      "Built Python services and data pipelines for verified analytics and operational reporting use cases.",
      "Containerized development workloads with Docker and supported documented AWS deployment procedures.",
      "Investigated production defects using logs, reproducible test cases, and version-controlled fixes.",
      "Reviewed pull requests and maintained technical documentation for shared service components.",
    ],
  }, {
    role: "Full-Stack Developer",
    company: "Example Digital",
    dates: "2016 - 2019",
    bullets: [
      "Implemented responsive web interfaces and server-side integrations for established client applications.",
      "Created reusable form, validation, and error-handling components from approved interface designs.",
      "Added unit and browser tests for documented customer journeys and accessibility requirements.",
    ],
  }, {
    role: "QA Automation Developer",
    company: "Example Systems",
    dates: "2014 - 2016",
    bullets: [
      "Developed automated regression checks for web application releases using verified acceptance criteria.",
      "Documented reproducible defects and partnered with developers to confirm corrected behavior.",
      "Maintained test data, execution reports, and release-readiness evidence for scheduled deployments.",
    ],
  }],
  certifications: [{ name: "AWS Certified Developer - Associate", issuer: "Amazon Web Services", year: "2023" }],
  training: [{ name: "Secure Software Development", provider: "Example Institute", dates: "2022" }],
  education: [{ degree: "Bachelor of Computer Science", institution: "Example University", dates: "2014" }],
  languages: [{ language: "English", proficiency: "Fluent" }, { language: "French", proficiency: "Intermediate" }],
  content_strategy: "direct",
});

export const adminCustomerOperationsResumeFixture = Object.freeze({
  name: "Maya Thompson",
  title: "Customer Operations Coordinator",
  contact: "maya.thompson@example.com | 647-555-0146 | Mississauga, Ontario",
  profile: "Customer operations coordinator with verified scheduling, documentation, issue resolution, records management, service delivery, and cross-functional coordination experience.",
  skills: {
    verifiedCore: ["Customer support", "Scheduling", "Documentation", "Issue resolution"],
    verifiedDomain: ["Service operations", "Records management", "Process compliance", "Data entry"],
    verifiedTools: ["Salesforce CRM", "Zendesk", "Microsoft 365", "Google Workspace"],
    transferable: ["Cross-functional coordination", "Customer communication"],
  },
  experience: [{
    role: "Customer Operations Coordinator",
    company: "Example Services",
    dates: "2021 - Present",
    bullets: [
      "Coordinated customer requests across support, billing, and field-service teams using documented workflows.",
      "Scheduled service appointments and maintained accurate case notes, status updates, and follow-up records.",
      "Resolved routine customer issues within established procedures and escalated exceptions to accountable teams.",
      "Prepared recurring service reports from verified CRM and ticketing records for operational review.",
    ],
  }, {
    role: "Administrative Coordinator",
    company: "Example Community Network",
    dates: "2018 - 2021",
    bullets: [
      "Coordinated calendars, meetings, room bookings, agendas, and distribution of approved meeting materials.",
      "Maintained electronic records and completed data entry according to documented privacy and retention procedures.",
      "Supported customer communications, intake questions, and referrals to the appropriate program contacts.",
      "Tracked office supplies, service requests, and invoice documentation for authorized review.",
    ],
  }, {
    role: "Customer Support Representative",
    company: "Example Retail Services",
    dates: "2015 - 2018",
    bullets: [
      "Responded to customer questions through phone, email, and ticketing channels using approved service guidance.",
      "Documented issue details, actions taken, and required follow-up in the customer relationship system.",
      "Coordinated unresolved cases with product, delivery, and account-support contacts without claiming management ownership.",
    ],
  }, {
    role: "Office Assistant",
    company: "Example Property Group",
    dates: "2012 - 2015",
    bullets: [
      "Supported reception, appointment scheduling, document preparation, filing, and general office administration.",
      "Updated contact and service records from reviewed source documents and reported inconsistencies for correction.",
      "Prepared meeting rooms and distributed correspondence according to established office procedures.",
    ],
  }],
  projects: [{
    name: "Customer Case Documentation Refresh",
    organization: "Example Services",
    startDate: "2023",
    endDate: "2023",
    description: "Supported a documented refresh of customer-service categories, response templates, and escalation references.",
    bullets: [
      "Reviewed existing case labels with support specialists and recorded approved terminology changes.",
      "Updated internal reference material after process owners confirmed the revised service workflow.",
    ],
  }],
  certifications: [{ name: "Customer Service Foundations", issuer: "Example College", year: "2021" }],
  training: [{ name: "Records and Privacy Procedures", provider: "Example Services", dates: "2022" }],
  education: [{ degree: "Office Administration Diploma", institution: "Example College", dates: "2012" }],
  languages: [{ language: "English", proficiency: "Fluent" }, { language: "Spanish", proficiency: "Conversational" }],
  content_strategy: "direct",
});

export const technicalTargetItem = Object.freeze({
  id: "phase-b1-technical",
  title: "Senior Software Engineer",
  company: "Example Product Company",
  category: "tech",
  description: "Build TypeScript and React applications, Node.js APIs, automated tests, and cloud deployment workflows.",
});

export const adminCustomerTargetItem = Object.freeze({
  id: "phase-b1-admin-operations",
  title: "Customer Operations Coordinator",
  company: "Example Service Company",
  category: "admin",
  description: "Coordinate scheduling, customer support, documentation, CRM records, issue resolution, and service follow-up.",
});

export const licensedElectricianResumeFixture = Object.freeze({
  name: "Alex Romero",
  title: "309A Construction and Maintenance Electrician",
  contact: "alex.romero@example.com | 416-555-0128 | Toronto, Ontario",
  profile: "Construction and maintenance electrician with verified commercial installation, circuit testing, repair, work-order, and preventive-maintenance experience.",
  skills: {
    verifiedCore: ["Commercial electrical installation", "Circuit testing", "Electrical repair", "Preventive maintenance"],
    verifiedDomain: ["Lighting systems", "Panels", "Conduit", "Work orders"],
    verifiedTools: ["Multimeter", "Hand tools", "Power tools"],
  },
  certifications: [{ name: "309A Construction and Maintenance Electrician Certificate of Qualification", issuer: "Skilled Trades Ontario", year: "2020" }],
  safety_certifications: ["WHMIS", "Working at Heights", "Lockout/tagout training"],
  experience: [{
    role: "Construction and Maintenance Electrician",
    company: "Example Electrical Services",
    dates: "2020 - Present",
    bullets: [
      "Installed and tested commercial lighting, conduit, wiring, and electrical panels from approved work plans.",
      "Diagnosed electrical faults with a multimeter and completed documented repairs within assigned work orders.",
      "Performed preventive maintenance on building electrical systems and recorded inspection findings.",
    ],
  }],
  education: [{ degree: "Electrical Apprenticeship Program", institution: "Example Training Centre", dates: "2020" }],
  content_strategy: "direct",
});

export const tradeApprenticeResumeFixture = Object.freeze({
  name: "Priya Singh",
  title: "Electrical Apprentice",
  contact: "priya.singh@example.com | 647-555-0177 | Brampton, Ontario",
  profile: "Electrical apprentice with verified supervised installation, material preparation, circuit-testing support, and construction-site safety experience.",
  skills: {
    verifiedCore: ["Supervised electrical installation", "Material preparation", "Circuit-testing support"],
    verifiedTools: ["Hand tools", "Power tools", "Multimeter"],
  },
  training: [{ name: "Registered Electrical Apprenticeship", provider: "Skilled Trades Ontario", dates: "2024 - Present" }],
  safety_certifications: ["WHMIS", "Working at Heights"],
  experience: [{
    role: "Electrical Apprentice",
    company: "Example Contracting",
    dates: "2024 - Present",
    bullets: [
      "Assisted with commercial lighting and conduit installation under the supervision of a licensed electrician.",
      "Prepared materials, maintained organized work areas, and documented completed supervised tasks.",
      "Supported circuit testing and reported readings to the supervising electrician.",
    ],
  }],
  education: [{ degree: "Electrical Techniques Certificate", institution: "Example College", dates: "2024" }],
  content_strategy: "direct",
});

export const propertyMaintenanceResumeFixture = Object.freeze({
  name: "Noah Williams",
  title: "Property Maintenance Worker",
  contact: "noah.williams@example.com | 905-555-0134 | Hamilton, Ontario",
  profile: "Property maintenance worker with verified general repair, fixture replacement, drywall patching, painting, grounds upkeep, and tenant-service experience.",
  skills: ["General repairs", "Fixture replacement", "Drywall patching", "Painting", "Grounds upkeep"],
  experience: [{
    role: "Property Maintenance Worker",
    company: "Example Housing Cooperative",
    dates: "2019 - Present",
    bullets: [
      "Completed approved work orders for drywall patching, painting, door hardware, and non-regulated fixture replacement.",
      "Inspected common areas and reported electrical, plumbing, and HVAC issues to licensed contractors.",
      "Communicated repair status to tenants and documented required follow-up.",
    ],
  }],
  projects: [{ name: "Suite Turnover Support", description: "Completed verified general repairs and finish work for scheduled suite turnovers." }],
  content_strategy: "direct",
});

export const fieldServiceTechnicianResumeFixture = Object.freeze({
  name: "Samira Haddad",
  title: "Field Service Technician",
  contact: "samira.haddad@example.com | 289-555-0152 | Oakville, Ontario",
  profile: "Field service technician with verified customer-site diagnostics, equipment installation, preventive maintenance, repair, work-order documentation, and operational handoff experience.",
  skills: {
    verifiedCore: ["Equipment diagnostics", "Installation", "Preventive maintenance", "Repair", "Customer-site service"],
    verifiedDomain: ["Service calls", "Work orders", "Parts inspection", "Operational handoff"],
    verifiedTools: ["Digital multimeter", "Diagnostic software", "Hand tools", "Power tools", "CMMS"],
    transferable: ["Customer communication", "Technical documentation"],
  },
  experience: [{
    role: "Senior Field Service Technician",
    company: "Example Equipment Services",
    dates: "2022 - Present",
    bullets: [
      "Diagnosed equipment faults during scheduled customer-site service calls using approved test procedures and diagnostic tools.",
      "Installed replacement components, tested equipment operation, and documented completed work in service records.",
      "Completed preventive-maintenance work orders and recorded inspection findings, parts used, and required follow-up.",
      "Explained equipment status and safe operating steps to customer contacts after completed service work.",
    ],
  }, {
    role: "Field Service Technician",
    company: "Example Industrial Support",
    dates: "2018 - 2022",
    bullets: [
      "Responded to assigned service calls for commercial equipment installation, inspection, diagnostics, and repair.",
      "Inspected motors, pumps, sensors, wiring connections, and mechanical components against service documentation.",
      "Coordinated parts requirements with dispatch and inventory teams before scheduled return visits.",
      "Prepared service summaries for reviewed work orders and escalated unresolved faults to technical specialists.",
    ],
  }, {
    role: "Equipment Maintenance Technician",
    company: "Example Production Group",
    dates: "2014 - 2018",
    bullets: [
      "Performed preventive maintenance on production equipment according to established schedules and work instructions.",
      "Inspected guards, belts, motors, pumps, and control components and reported conditions requiring authorized repair.",
      "Replaced approved mechanical components and tested equipment operation before documented return to service.",
      "Recorded maintenance activity and follow-up requirements in the computerized maintenance management system.",
    ],
  }, {
    role: "Service Installation Assistant",
    company: "Example Technical Installations",
    dates: "2011 - 2014",
    bullets: [
      "Assisted technicians with customer-site equipment delivery, assembly, installation, and operational testing.",
      "Prepared hand tools, power tools, fasteners, cables, and approved installation materials for assigned work.",
      "Maintained accurate installation checklists and returned completed documentation for supervisor review.",
    ],
  }],
  projects: [{
    name: "Customer Equipment Replacement Program",
    organization: "Example Equipment Services",
    startDate: "2023",
    endDate: "2024",
    description: "Supported a scheduled replacement program for documented customer-site equipment.",
    bullets: [
      "Inspected installation locations and documented verified equipment, connection, and access conditions.",
      "Installed assigned replacement units and completed approved operational test checklists.",
    ],
  }, {
    name: "Preventive-Maintenance Procedure Review",
    organization: "Example Industrial Support",
    startDate: "2021",
    endDate: "2021",
    description: "Reviewed existing service procedures with technicians and documented confirmed field steps.",
    bullets: [
      "Recorded approved inspection points and required service-record fields for recurring work orders.",
      "Validated revised checklists during scheduled maintenance visits and reported unclear instructions.",
    ],
  }],
  certifications: [{ name: "Industrial Equipment Service Certificate", issuer: "Example Technical Institute", year: "2018" }],
  training: [{ name: "Equipment Diagnostics and Service Documentation", provider: "Example Equipment Services", dates: "2023" }],
  safety_certifications: ["WHMIS", "Lockout/tagout training", "First Aid/CPR"],
  education: [{ degree: "Mechanical Technician Diploma", institution: "Example College", dates: "2011" }],
  languages: [{ language: "English", proficiency: "Fluent" }, { language: "Arabic", proficiency: "Fluent" }],
  content_strategy: "direct",
});

export const landscapeMaintenanceResumeFixture = Object.freeze({
  name: "Ethan Brooks",
  title: "Landscape Maintenance Worker",
  contact: "ethan.brooks@example.com | 519-555-0119 | Guelph, Ontario",
  profile: "Landscape maintenance worker with verified grounds care, irrigation inspection, planting, site preparation, and outdoor equipment operation experience.",
  skills: ["Grounds maintenance", "Planting", "Site preparation", "Irrigation inspection", "Outdoor equipment operation"],
  experience: [{
    role: "Landscape Maintenance Worker",
    company: "Example Grounds Services",
    dates: "2017 - Present",
    bullets: [
      "Maintained commercial grounds through mowing, trimming, planting, debris removal, and seasonal site preparation.",
      "Inspected irrigation components and reported damaged lines, valves, and sprinkler heads for approved repair.",
      "Operated documented outdoor equipment and completed pre-use inspections according to established procedures.",
    ],
  }],
  content_strategy: "direct",
});

export const electricianTargetItem = Object.freeze({
  id: "phase-b2-electrician",
  title: "Construction and Maintenance Electrician",
  company: "Example Facilities",
  category: "trades",
  description: "A valid 309A electrical licence is required. Install, test, inspect, and repair commercial electrical systems.",
});

export const apprenticeTargetItem = Object.freeze({
  id: "phase-b2-apprentice",
  title: "Electrical Apprentice",
  company: "Example Contracting",
  category: "trades",
  description: "Assist licensed electricians with supervised installation, testing, materials, and site documentation.",
});

export const fieldServiceTargetItem = Object.freeze({
  id: "phase-b2-field-service",
  title: "Field Service Technician",
  company: "Example Equipment Company",
  category: "home_services",
  description: "Complete customer-site diagnostics, equipment installation, preventive maintenance, repair, service calls, and work-order documentation.",
});

export const verifiedElectricianReview = Object.freeze({
  ...verifiedPostingReview,
  requirements: [{
    requirement: "Valid 309A electrical licence required",
    classification: "direct",
    evidence_match: "direct",
    resume_evidence: "309A Construction and Maintenance Electrician Certificate of Qualification",
  }],
});

export const missingElectricianCredentialReview = Object.freeze({
  ...verifiedPostingReview,
  requirements: [{
    requirement: "Valid 309A electrical licence required",
    classification: "credential-required",
    evidence_match: "missing",
    resume_evidence: "",
  }],
  missing_evidence: ["Valid 309A electrical licence"],
});

export const noisyFieldServicePostingReview = Object.freeze({
  ...verifiedPostingReview,
  requirements: [
    {
      requirement: "VALID DRIVER'S LICENCE\nREQUIRED FOR SERVICE CALLS",
      classification: "credential-required",
      evidence_match: "missing",
      resume_evidence: "",
    },
    {
      requirement: "Valid driver's licence required for service calls",
      classification: "credential-required",
      evidence_match: "missing",
      resume_evidence: "",
    },
    {
      requirement: "WHMIS REQUIRED   WHMIS REQUIRED",
      classification: "credential-required",
      evidence_match: "missing",
      resume_evidence: "",
    },
  ],
  missing_evidence: ["Valid driver's licence", "WHMIS", "Valid driver's licence"],
});

export const marketingCommunicationsResumeFixture = Object.freeze({
  name: "Taylor Chen",
  title: "Marketing Communications Specialist",
  candidate: {
    email: "taylor.chen@example.com",
    phone: "416-555-0168",
    city: "Toronto",
    region: "Ontario",
    professionalLinks: [{ label: "LinkedIn", url: "https://www.linkedin.com/in/taylor-chen-example" }],
  },
  profile: "Marketing communications specialist with verified campaign planning, content development, audience segmentation, channel coordination, reporting, and stakeholder communications experience.",
  skills: {
    verifiedCore: ["Campaign planning", "Content development", "Audience segmentation", "Stakeholder communications"],
    verifiedDomain: ["Email marketing", "Editorial planning", "Brand consistency", "Campaign reporting"],
    verifiedTools: ["Google Analytics", "HubSpot", "Mailchimp", "WordPress"],
    transferable: ["Cross-functional coordination", "Presentation"],
  },
  experience: [{
    role: "Marketing Communications Specialist",
    company: "Example Learning Group",
    dates: "2022 - Present",
    bullets: [
      "Planned and launched integrated email and content campaigns for established professional-learning programs.",
      "Developed audience segments in HubSpot and coordinated approved content across email, web, and social channels.",
      "Reported a verified 18% increase in newsletter click-through rate after testing documented subject-line and content changes.",
      "Partnered with program, sales, and customer-service teams to align campaign timing and approved messaging.",
    ],
  }, {
    role: "Communications Coordinator",
    company: "Example Community Foundation",
    dates: "2019 - 2022",
    bullets: [
      "Created and published approved website, newsletter, event, and donor-communications content.",
      "Maintained the editorial calendar and coordinated reviews with program leads and external partners.",
      "Monitored Google Analytics and Mailchimp reports and prepared recurring channel summaries for communications planning.",
    ],
  }, {
    role: "Content Assistant",
    company: "Example Business Association",
    dates: "2016 - 2019",
    bullets: [
      "Produced member-newsletter copy and WordPress updates from reviewed source material.",
      "Supported event communications, speaker coordination, registration updates, and post-event content preparation.",
      "Applied established brand and editorial guidance across approved digital materials.",
    ],
  }, {
    role: "Customer Programs Assistant",
    company: "Example Services Network",
    dates: "2014 - 2016",
    bullets: [
      "Prepared customer-facing program information and coordinated scheduled communications with service teams.",
      "Documented recurring questions and supported approved updates to customer information resources.",
    ],
  }],
  projects: [{
    name: "Member Newsletter Refresh",
    organization: "Example Community Foundation",
    startDate: "2021",
    endDate: "2021",
    description: "Coordinated a verified refresh of newsletter structure, content planning, and reporting.",
    bullets: [
      "Evaluated prior channel reports and documented approved audience and content changes.",
      "Implemented the revised Mailchimp template and editorial calendar after stakeholder review.",
    ],
  }, {
    name: "Program Launch Content",
    organization: "Example Learning Group",
    startDate: "2023",
    endDate: "2024",
    description: "Developed verified launch content for an established professional-learning program.",
    bullets: [
      "Created approved email, landing-page, and social copy for the scheduled launch sequence.",
      "Reported channel activity using documented HubSpot and Google Analytics records.",
    ],
  }],
  certifications: [{ name: "Digital Marketing Certificate", issuer: "Example College", year: "2021" }],
  education: [{ degree: "Bachelor of Communications", institution: "Example University", dates: "2014" }],
  languages: [{ language: "English", proficiency: "Fluent" }, { language: "Mandarin", proficiency: "Conversational" }],
  content_strategy: "direct",
});

export const marketingCareerChangerResumeFixture = Object.freeze({
  name: "Amara Johnson",
  title: "Customer Programs Coordinator",
  contact: "amara.johnson@example.com | 647-555-0184 | Toronto, Ontario",
  profile: "Customer programs coordinator with verified stakeholder communication, research, presentation, documentation, event coordination, and project-coordination experience.",
  skills: {
    verifiedCore: ["Stakeholder communication", "Research", "Presentation", "Documentation"],
    transferable: ["Project coordination", "Event coordination", "Customer communication"],
  },
  experience: [{
    role: "Customer Programs Coordinator",
    company: "Example Community Services",
    dates: "2020 - Present",
    bullets: [
      "Coordinated program schedules, stakeholder communications, presentation materials, and approved customer information.",
      "Researched recurring customer questions and documented findings for program-owner review.",
      "Supported community events through speaker coordination, attendee communications, and prepared reference materials.",
    ],
  }, {
    role: "Administrative Assistant",
    company: "Example Education Network",
    dates: "2017 - 2020",
    bullets: [
      "Prepared meeting documents and presentations from approved source material.",
      "Maintained project records and coordinated follow-up with internal and external stakeholders.",
    ],
  }],
  education: [{ degree: "Business Administration Diploma", institution: "Example College", dates: "2017" }],
  content_strategy: "career_transition",
});

export const creativeDesignResumeFixture = Object.freeze({
  name: "Riley Morgan",
  title: "Senior Visual Designer",
  candidate: {
    email: "riley.morgan@example.com",
    phone: "905-555-0191",
    city: "Hamilton",
    region: "Ontario",
    professionalLinks: [
      { label: "Portfolio", url: "https://portfolio.example.com/riley-morgan" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/riley-morgan-example" },
    ],
  },
  profile: "Visual designer with verified brand, digital, presentation, production-design, design-system, and cross-functional creative experience.",
  skills: {
    verifiedCore: ["Visual design", "Brand design", "Presentation design", "Production design"],
    verifiedDomain: ["Typography", "Page layout", "Design systems", "Print production"],
    verifiedTools: ["Adobe Photoshop", "Adobe Illustrator", "Adobe InDesign", "Figma", "After Effects"],
    transferable: ["Creative collaboration", "Stakeholder presentation"],
  },
  experience: [{
    role: "Senior Visual Designer",
    company: "Example Studio Group",
    dates: "2021 - Present",
    bullets: [
      "Designed approved brand, campaign, presentation, and digital materials across established client programs.",
      "Extended documented Figma component patterns and maintained visual consistency across production deliverables.",
      "Presented design directions to stakeholders and incorporated reviewed feedback into final production files.",
      "Prepared accessible source files and production specifications for approved digital and print outputs.",
    ],
  }, {
    role: "Production Designer",
    company: "Example Creative Services",
    dates: "2018 - 2021",
    bullets: [
      "Produced and adapted approved layouts in Adobe InDesign, Illustrator, and Photoshop for digital and print delivery.",
      "Maintained typography, spacing, image, and brand standards across recurring production work.",
      "Collaborated with writers, designers, and production partners to prepare reviewed final artwork.",
    ],
  }, {
    role: "Presentation Designer",
    company: "Example Advisory Group",
    dates: "2015 - 2018",
    bullets: [
      "Designed executive presentations and reusable visual layouts from verified source content.",
      "Created diagrams and information graphics that preserved approved facts and reading order.",
      "Prepared final presentation files and documented handoff guidance for internal teams.",
    ],
  }, {
    role: "Junior Graphic Designer",
    company: "Example Communications",
    dates: "2013 - 2015",
    bullets: [
      "Created and adapted approved digital graphics, event materials, and document layouts.",
      "Organized source assets and prepared final files for senior-designer review.",
    ],
  }],
  projects: [{
    name: "Brand System Extension",
    organization: "Example Studio Group",
    startDate: "2023",
    endDate: "2024",
    description: "Extended a verified brand system for established digital and presentation deliverables.",
    bullets: [
      "Documented approved typography, color, spacing, and component applications in Figma.",
      "Prepared reusable templates and production guidance for reviewed internal use.",
    ],
  }, {
    name: "Annual Report Design",
    organization: "Example Community Foundation",
    startDate: "2022",
    endDate: "2022",
    description: "Designed a verified annual-report layout using approved narrative and financial source content.",
    bullets: [
      "Developed page hierarchy, typography, and information-graphic treatments in Adobe InDesign and Illustrator.",
      "Prepared reviewed digital and print production files with documented accessibility checks.",
    ],
  }],
  certifications: [{ name: "Accessible Document Design", issuer: "Example Design Institute", year: "2022" }],
  education: [{ degree: "Bachelor of Design", institution: "Example University", dates: "2013" }],
  languages: [{ language: "English", proficiency: "Fluent" }, { language: "French", proficiency: "Intermediate" }],
  content_strategy: "direct",
});

export const creativeAdjacentResumeFixture = Object.freeze({
  name: "Diego Alvarez",
  title: "Proposal Coordinator",
  contact: "diego.alvarez@example.com | 289-555-0142 | Oakville, Ontario",
  profile: "Proposal coordinator with verified document production, presentation production, layout formatting, brand-consistency support, and visual-content preparation experience.",
  skills: {
    verifiedCore: ["Document production", "Presentation production", "Layout formatting"],
    transferable: ["Brand consistency support", "Visual content preparation", "Stakeholder coordination"],
  },
  experience: [{
    role: "Proposal Coordinator",
    company: "Example Professional Services",
    dates: "2021 - Present",
    bullets: [
      "Prepared proposal documents and presentation materials from approved technical and commercial content.",
      "Applied established layout and brand guidance and coordinated stakeholder review before submission.",
      "Organized approved visual content and maintained version-controlled production files.",
    ],
  }],
  education: [{ degree: "Communications Diploma", institution: "Example College", dates: "2021" }],
  content_strategy: "adjacent",
});

export const marketingTargetItem = Object.freeze({
  id: "phase-b3-marketing",
  title: "Marketing Communications Specialist",
  company: "Example Member Organization",
  category: "marketing",
  description: "Plan integrated campaigns, develop content, coordinate channels, use HubSpot, and improve conversion by 30%.",
});

export const creativeTargetItem = Object.freeze({
  id: "phase-b3-creative",
  title: "Visual Designer",
  company: "Example Product Studio",
  category: "design",
  description: "Create brand and digital design in Figma and Adobe tools, lead creative reviews, and maintain the design system.",
});
