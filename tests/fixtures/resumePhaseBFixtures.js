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
