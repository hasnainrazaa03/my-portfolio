import { Code, Cpu, Database, Terminal, Wind, BookOpen, Rocket, Briefcase, GitBranch } from "lucide-react";

// --- CONFIGURATION SETTINGS ---
export const CONFIG = {
  // Set this to 'true' to block right-clicks and copy-paste.
  // Set to 'false' otherwise.
  enableContentProtection: false, 
};

export const PERSONAL_INFO = {
  name: "Hasnain Raza",
  title: "Hi | I'm Hasnain...",
  tagline: "Ready for takeoff?",
  bio: "We're about to launch into my journey!",
  bioHeadline: "Lucknow native. Orbiting between code, tea, and whatever rabbit hole currently has gravitational pull.",
  bioStory: "I'm the kind of person who finds debugging weirdly satisfying and spends three hours perfecting a CSS animation that no one will notice. The way you do anything is the way you do everything, so whether I'm building ML models, brewing the perfect cup of tea in true Lucknow style, or falling into a 2 AM reel rabbit hole, I'm doing it with full attention. I oscillate between deep focus and beautiful chaos. I game, I read, I build, I scroll. But whatever I'm doing, I'm doing it right.",
  email: "razam@usc.edu",
  socials: {
    github: "https://github.com/hasnainrazaa03",
    linkedin: "https://linkedin.com/in/hasnainraza03",
    instagram: "https://instagram.com/hasnainraza03"
  }
};

export const STATS = [
  { target: 500, label: "Total Commits", suffix: "+", icon: GitBranch },
  { target: 10, label: "Projects Built", suffix: "+", icon: Rocket },
  { target: 3, label: "Years Experience", suffix: "+", icon: Briefcase },
  { target: 6, label: "Pro Languages", suffix: "+", icon: Code }
];

export const EDUCATION = [
  {
    id: 1,
    degree: "M.S. in Computer Science",
    school: "University of Southern California",
    period: "2025 - 2027 (Expected)",
    gpa: "4.0 / 4.0", 
    coursework: "Analysis of Algorithms (CSCI570), Computer Networks (EE450), Programming Systems Design (CSCI455), Database Systems (CSCI585)",
    image: "/USC.png",
    url: "https://www.usc.edu/" 
  },
  {
    id: 2,
    degree: "B.E. in Aerospace Engg.",
    school: "RV College of Engineering",
    period: "2018 - 2022",
    gpa: "9.10 / 10.0", 
    coursework: "Engineering Mathematics I-IV, Scientific Computing using MATLAB, Computational Advanced Numerical Methods, Programming in C, Mobile Application Development, Computational Fluid Dynamics, Finite Element Methods",
    image: "/RVCE.png",
    url: "https://www.rvce.edu.in/"
  },
  {
    id: 3,
    degree: "High School (Science)",
    school: "Study Hall",
    period: "2015 - 2017",
    gpa: "9.8 / 10.0",
    coursework: "Physics, Chemistry, Mathematics, Computer Science",
    image: "/shef.png",
    url: "https://studyhallschool.com/"
  }
];

export const PROJECTS = [
  {
    id: 1,
    title: "Project Vimaan",
    category: "AI/ML",
    status: "In Progress",
    description: "An NLU-driven voice command co-pilot integrated into the X-Plane flight simulator.",
    longDescription: "Project Vimaan is an AI-powered natural language understanding system designed to control the X-Plane flight simulator through voice commands. I engineered a schema-driven data generation pipeline that produced structured, labeled command examples using transformer-based paraphrasing (Pegasus, FLAN-T5). I fine-tuned a DistilBERT-based joint intent-and-slot model and optimized it using dynamic INT8 quantization for efficient offline inference. The trained model was integrated into the X-Plane plugin architecture using a thread-safe inter-process communication layer with real-time text-to-speech feedback, enabling hands-free cockpit interaction without blocking the simulator's execution loop.",
    images: ["/Xplane.jpg", "/Xplane2.jpg"],
    techStack: [
      "Python",
      "PyTorch",
      "Hugging Face Transformers",
      "DistilBERT",
      "Joint Intent-Slot Modeling",
      "Schema-Driven Data Generation",
      "Pegasus",
      "FLAN-T5",
      "Transformer Fine-Tuning",
      "Model Quantization (INT8)",
      "NLU Pipeline Architecture",
      "X-Plane SDK",
      "XPPython3",
      "Thread-safe Inter-Process Communication",
      "Text-to-Speech (TTS)",
      "NumPy",
      "Pandas",
      "Git"
    ],
    links: { github: "https://github.com/hasnainrazaa03/Project-Vimaan", demo: null }
  },
  {
    id: 2,
    title: "Numerical Investigation of Store Separation from a Rectangular Cavity",
    category: "Aerospace",
    status: "Completed",
    description: "Transient CFD study of weapons-bay store separation dynamics with a physics-based 6-DOF solver.",
    longDescription: "This project focused on modeling store separation dynamics from a rectangular weapons-bay cavity (L/D = 5). I developed a C-based 6-degree-of-freedom (6-DOF) solver as a user-defined function in ANSYS Fluent to simulate gravity-driven trajectories at subsonic conditions. Using PyFluent, I automated transient CFD simulations with a k-ω SST turbulence model on an overset mesh to accurately capture unsteady aerodynamic loads during separation. I also built MATLAB-based post-processing pipelines to analyze terabyte-scale simulation outputs, generate 3D trajectory visualizations, and validate separation safety criteria. The work combined physics-based simulation, automation, and statistical validation to ensure reliable aerodynamic predictions.",
    images: [
      "/DRDO1.png"
    ],
    techStack: [
      "ANSYS Fluent",
      "PyFluent Automation",
      "6-DOF Solver (C UDF)",
      "Transient CFD",
      "Overset Mesh",
      "k-ω SST Turbulence Model",
      "MATLAB Post-Processing",
      "Z-score Outlier Detection",
      "3D Trajectory Visualization",
      "Python",
      "Git"
    ],
    links: { 
      github: null, 
      demo: null
    }
  },
  {
    id: 3,
    title: "Manzil Recipe Vault",
    category: "Full-Stack Web",
    status: "Completed",
    description: "Scalable MERN-based collaborative recipe platform with secure authentication and optimized query architecture.",
    longDescription: "Manzil Recipe Vault is a full-stack MERN application designed for collaborative recipe management. I architected a RESTful API using Node.js and Express.js with optimized MongoDB indexing and pagination to ensure efficient query performance under concurrent usage. The platform uses Firebase Authentication with backend JWT verification to enforce strict user-level access control. For media handling, I integrated Cloudinary Signed Uploads with server-side validation to securely manage user-generated content. On the frontend, I used React with Context API and custom hooks to reduce prop drilling and improve maintainability. I also implemented debounced search, dynamic filtering, and TipTap rich text editing with DOMPurify sanitization to prevent XSS vulnerabilities.",
    images: [
      "/ManzilDash.jpg"
    ],
    techStack: [
      "React",
      "Context API",
      "Custom React Hooks",
      "Node.js",
      "Express.js",
      "MongoDB",
      "MongoDB Indexing",
      "Pagination",
      "REST API Architecture",
      "Firebase Authentication",
      "JWT Verification",
      "Cloudinary Signed Uploads",
      "TipTap Rich Text Editor",
      "DOMPurify (XSS Prevention)",
      "Debounced Search",
      "Query Optimization",
      "Git"
    ],
    links: {
      github: "https://github.com/hasnainrazaa03/Manzil-Recipe-Vault",
      demo: "https://manzil-recipe-vault.vercel.app/"
    }
  },
  {
    id: 4,
    title: "USC Ledger",
    category: "Full-Stack Web",
    status: "Live (Personal)",
    description: "AI-augmented financial management platform featuring a custom reconciliation engine and precision-first transaction architecture.",
    longDescription: "USC Ledger is a full-stack financial systems project I built using React, Node.js, and MongoDB. At its core, I designed a sequential reconciliation engine (“Surgical Sync”) to resolve MongoDB write conflicts and prevent race conditions during rapid state updates. I implemented precision-first financial logic using epsilon-aware rounding and fixed-precision arithmetic to eliminate floating-point inconsistencies in multi-currency transactions (USD/INR). The system integrates the Frankfurter FX API for currency normalization and Google Gemini for structured financial analysis and automated audit-style insights. Performance was optimized using debounced autosave and controlled state updates to maintain transactional consistency under concurrent interactions.",
    images: [
      "/USCLedger.jpg"
    ],
    techStack: [
      "React",
      "TypeScript",
      "Node.js",
      "Express.js",
      "MongoDB",
      "Sequential Reconciliation Engine",
      "Concurrency Control",
      "MongoDB Write Conflict Resolution (P2034)",
      "Atomic Transactions",
      "Precision Arithmetic",
      "Epsilon-aware Rounding",
      "Hierarchical Budget Allocation",
      "Debounced Autosave (800ms)",
      "Frankfurter FX API",
      "Google Gemini API",
      "Structured Prompt Engineering",
      "Tailwind CSS",
      "Git"
    ],
    links: {
      github: "https://github.com/hasnainrazaa03/intelligent-expense-tracker",
      demo: "https://usc-ledger.vercel.app/"
    }
  },
  {
    id: 5,
    title: "Numerical Investigation of Vortex Influence on NACA 4412 Airfoil",
    category: "Aerospace",
    status: "Completed",
    description: "CFD-based study of turbulent wake interactions and their impact on airfoil aerodynamic performance.",
    longDescription: "This project investigated how vortices generated by a leading NACA 0012 airfoil influence the aerodynamic performance of a trailing NACA 4412 airfoil. Using ANSYS Fluent with PyFluent automation, I simulated turbulent wake interactions and analyzed variations in lift and drag coefficients under different flow conditions. I developed automated Python scripts to extract aerodynamic coefficients and generate performance plots, enabling quantitative comparison of wake-induced performance degradation. The project emphasized aerodynamic modeling, simulation automation, and structured post-processing.",
    images: [
      "/CFDNACA.jpg"
    ],
    techStack: [
      "ANSYS Fluent",
      "PyFluent Automation",
      "Transient CFD",
      "Turbulent Wake Analysis",
      "Lift and Drag Coefficient Analysis",
      "Aerodynamic Coefficient Plotting",
      "Python",
      "Matplotlib",
      "Git"
    ],
    links: { github: null, demo: null }
  },
{
  id: 6,
  title: "Brain Tumor Segmentation (BraTS 2021 - Vision Transformer)",
  category: "AI/ML",
  status: "Completed",
  description: "Research project exploring Vision Transformer architectures for 3D brain tumor segmentation in the BraTS 2021 Challenge.",
  longDescription: "This project focused on training and evaluating Vision Transformer-based architectures for volumetric brain tumor segmentation as part of the BraTS 2021 Challenge, where our team placed #4 out of 200+ teams. The work emphasized architectural experimentation for 3D medical imaging, including volumetric patching strategies, normalization pipelines, and transformer-based attention mechanisms for capturing global spatial context. I also explored FEM-inspired refinement ideas to improve structural consistency of segmentation outputs. The project was research-oriented and centered on model design, training stability, and volumetric representation learning.",
  images: ["/ViT2.jpg", "/ViT.png"],
  techStack: [
    "Python",
    "PyTorch",
    "Vision Transformer",
    "3D Medical Image Segmentation",
    "Volumetric Patch Extraction",
    "Attention Mechanisms",
    "FEM-inspired Refinement",
    "Medical Imaging (MRI)",
    "NumPy",
    "Pandas",
    "Git"
  ],
  links: { github: null, demo: null }
},
{
  id: 7,
  title: "RVSAT-1 (Team Antariksh)",
  category: "Aerospace",
  status: "Completed",
  description: "2U CubeSat mission launched onboard ISRO's PSLV C-60, contributing to design and systems engineering.",
  longDescription: "RVSAT-1 is a 2U CubeSat developed as part of Team Antariksh and successfully launched in December 2024 onboard ISRO’s PSLV C-60 mission. I contributed to CAD modeling, structural design, and subsystem-level integration, ensuring mechanical compatibility and mission readiness. Beyond engineering, I played a leadership role within a 100+ member team, coordinating across subsystems and contributing to sponsorship, outreach, and overall project execution. The experience strengthened my systems-level thinking by bridging hardware constraints, simulation, and large-team coordination.",
  images: [
    "/RVSAT.png"
  ],
  techStack: [
    "CubeSat Design",
    "CAD Modeling",
    "Structural Simulation",
    "Systems Engineering",
    "Mission Integration",
    "Subsystem Coordination",
    "Aerospace Project Management",
    "PSLV C-60 Launch"
  ],
  links: { github: null, demo: "https://www.teamantariksh.in/rvsat/" }
},
{
  id: 8,
  title: "ReSOLV-1 (Team Antariksh)",
  category: "Aerospace",
  status: "Completed",
  description: "Multi-year high-power sounding rocket development program combining flight systems engineering and team leadership.",
  longDescription: "As part of Team Antariksh, I contributed to the development of multiple high-power sounding rockets across iterative design cycles. I worked on flight systems engineering, including programming Arduino-based microcontrollers in C++ to capture dynamic telemetry data during powered flight. The program involved aerodynamic modeling, structural design, recovery systems, and propulsion integration. In addition to technical work, I played a leadership role within a 100+ member team, coordinating across subsystems, supporting sponsorship initiatives, and contributing to overall project execution. The experience strengthened my understanding of end-to-end aerospace system development under real launch constraints.",
  images: [
    "/insight1.jpg"
  ],
  techStack: [
    "Rocket Systems Engineering",
    "Arduino (C++)",
    "Flight Telemetry",
    "Avionics Integration",
    "Aerodynamic Modeling",
    "Structural Design",
    "Recovery Systems",
    "Propulsion Integration",
    "Cross-functional Team Leadership",
    "Project Coordination"
  ],
  links: { github: null, demo: "https://www.teamantariksh.in/resolv/" }
}
];

export const SKILLS = [
  { 
    category: "Languages", 
    icon: Terminal,
    items: [
      { name: "Python", level: "Expert", pct: 95, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" },
      { name: "C++", level: "Expert", pct: 90, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg" },
      { name: "C", level: "Expert", pct: 88, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/c/c-original.svg" },
      { name: "MATLAB", level: "Expert", pct: 90, image: "https://upload.wikimedia.org/wikipedia/commons/2/21/Matlab_Logo.png" },
      { name: "Java", level: "Intermediate", pct: 70, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg" },
      { name: "JavaScript", level: "Intermediate", pct: 65, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" },
      { name: "TypeScript", level: "Intermediate", pct: 75, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" },
      { name: "SQL", level: "Advanced", pct: 85, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg" },
      { name: "R", level: "Intermediate", pct: 70, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/r/r-original.svg" }
    ]
  },
  { 
    category: "AI & ML", 
    icon: Cpu,
    items: [
      { name: "PyTorch", level: "Expert", pct: 92, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg" },
      { name: "Computer Vision", level: "Expert", pct: 88, image: "https://cdn-icons-png.flaticon.com/512/2103/2103633.png" },
      { name: "TensorFlow", level: "Intermediate", pct: 75, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg" },
      { name: "NLP", level: "Intermediate", pct: 70, image: "https://cdn-icons-png.flaticon.com/512/10435/10435171.png" },
      { name: "Scikit-learn", level: "Expert", pct: 85, image: "https://upload.wikimedia.org/wikipedia/commons/0/05/Scikit_learn_logo_small.svg" },
      { name: "Transformers", level: "Advanced", pct: 90, image: "https://cdn-icons-png.flaticon.com/512/2103/2103633.png" },
      { name: "LLM Fine-Tuning", level: "Advanced", pct: 88, image: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png" },
      { name: "Prompt Engineering", level: "Advanced", pct: 90, image: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png" },
      { name: "Hugging Face", level: "Advanced", pct: 88, image: "https://huggingface.co/front/assets/huggingface_logo-noborder.svg" }
    ]
  },
  { 
    category: "Backend & Data", 
    icon: Database,
    items: [
      { name: "SQL/Postgres", level: "Intermediate", pct: 78, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" },
      { name: "MongoDB", level: "Intermediate", pct: 75, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" },
      { name: "Node.js", level: "Intermediate", pct: 70, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" },
      { name: "Docker", level: "Intermediate", pct: 65, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" },
      { name: "REST APIs", level: "Expert", pct: 85, image: "https://cdn-icons-png.flaticon.com/512/8297/8297437.png" },
      { name: "System Design", level: "Advanced", pct: 85, image: "https://cdn-icons-png.flaticon.com/512/8297/8297437.png" },
      { name: "Concurrency Control", level: "Advanced", pct: 85, image: "https://cdn-icons-png.flaticon.com/512/3524/3524659.png" },
      { name: "Data Pipelines (ETL)", level: "Advanced", pct: 88, image: "https://cdn-icons-png.flaticon.com/512/888/888879.png" },
      { name: "MongoDB Indexing", level: "Advanced", pct: 85, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" },
      { name: "Express.js", level: "Advanced", pct: 80, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" }
    ]
  },
  { 
    category: "Aerospace & Tools", 
    icon: Wind,
    items: [
      { name: "CFD Analysis", level: "Expert", pct: 95, image: "https://cdn-icons-png.flaticon.com/512/5405/5405929.png" },
      { name: "Ansys", level: "Expert", pct: 95, image: "https://upload.wikimedia.org/wikipedia/commons/1/14/Ansys_logo_%282019%29.svg" },
      { name: "CATIA", level: "Expert", pct: 95, image: "https://upload.wikimedia.org/wikipedia/commons/d/dd/CATIA_Logotype_RGB_Blue.png" },
      { name: "Simulink", level: "Expert", pct: 90, image: "https://upload.wikimedia.org/wikipedia/commons/3/36/Simulink_Logo_%28non-wordmark%29.png" },
      { name: "SolidWorks", level: "Intermediate", pct: 70, image: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d2/SolidWorks_Logo.svg/330px-SolidWorks_Logo.svg.png?20130509090050" },
      { name: "Git", level: "Expert", pct: 88, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg" },
      { name: "Linux", level: "Intermediate", pct: 75, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg" }
    ]
  },
];

export const EXPERIENCE = [
  {
    id: 1,
    role: "Technology Analyst",
    company: "Deloitte",
    period: "Aug 2022 - Nov 2024",
    location: "Bengaluru, India",
    logo: "/Deloitte.png",
    description: [
      "Designed and developed a Pega PRPC-based SaaS workflow platform automating customer creation and modification processes across 35+ countries, orchestrating downstream REST APIs and achieving a 10x throughput increase.",
      "Engineered a REST API orchestration layer integrating multiple enterprise services for validation, approval routing, and legacy system communication, improving system reliability and latency.",
      "Validated performance gains by applying a Welch two-sample t-test on processing-time datasets, confirming a statistically significant 44% latency reduction.",
      "Built 100+ ServiceNow business intelligence reports consolidated into 3 interactive dashboards for real-time KPI tracking and SLA monitoring.",
      "Developed LLM orchestration pipelines using few-shot and chain-of-thought prompting, integrating RLHF-driven feedback loops to improve alignment with human-annotated labels.",
      "Standardized data governance workflows for enterprise LLM training datasets, implementing automated quality checks and PII-masking filters to reduce data preparation overhead by 30%."
    ]
  },
  {
    id: 2,
    role: "Research Intern",
    company: "Defence Research and Development Organisation (DRDO)",
    period: "Jan 2022 - Aug 2022",
    location: "Bengaluru, India",
    logo: "/DRDO.png",
    description: [
      "Led a 4-member team investigating weapons-bay store separation dynamics (L/D = 5), developing a C-based 6-DOF solver as a user-defined function in ANSYS Fluent to simulate gravity-driven release trajectories.",
      "Automated transient CFD pipelines using PyFluent with a k-ω SST turbulence model on an overset mesh, generating large-scale aerodynamic datasets for downstream modeling and analysis.",
      "Applied linear regression to correlate lift and drag coefficients with separation trajectories, identifying key aerodynamic predictors for release stability.",
      "Implemented Z-score outlier detection and statistical filtering to ensure high-integrity pressure and velocity datasets prior to regression analysis.",
      "Built MATLAB-based post-processing modules to generate 3D trajectory visualizations and time-history plots for quantitative flight-path validation."
    ]
  },
  {
    id: 3,
    role: "Founding Engineer",
    company: "Prana.ai",
    period: "Sep 2019 - Dec 2021",
    location: "Remote",
    logo: "/Prana.png",
    description: [
      "Architected end-to-end ML pipelines processing 5M+ MRI/CT volumes from 20+ clinical sources, implementing normalization, volumetric patch extraction, augmentation, and data balancing for scalable training workflows.",
      "Implemented a depthwise separable CNN for real-time 3D medical image segmentation, optimizing inference to achieve sub-second latency for diagnostic assistance.",
      "Developed SO(3)-equivariant CNN-based super-resolution techniques using rotation-equivariant convolutions to improve image clarity by approximately 35%.",
      "Designed containerized ML services deployed on GPU-backed infrastructure, implementing CI/CD workflows for reproducible training and model version control.",
      "Contributed to securing $50,000 in pre-seed funding by building production-ready ML prototypes and demonstrating clinical viability."
    ]
  },
  {
    id: 4,
    role: "Project Head and Engineer",
    company: "Team Antariksh",
    period: "Sep 2018 - Aug 2022",
    location: "Bengaluru, India",
    logo: "/ta.svg",
    description: [
      "Led a 100+ member interdisciplinary team developing aerospace systems including the RVSAT-1 2U CubeSat (launched December 2024 onboard ISRO’s PSLV C-60) and the ReSOLV-1 sounding rocket.",
      "Contributed to CAD modeling, structural design, and subsystem integration for CubeSat development, ensuring mechanical compatibility and mission readiness.",
      "Programmed Arduino-based flight microcontrollers in C++ to capture dynamic telemetry data during rocket launches, supporting real-time flight monitoring and post-flight analysis.",
      "Coordinated cross-functional engineering efforts across aerostructures, avionics, propulsion, recovery, and payload integration.",
      "Led sponsorship, outreach, and project execution strategy, managing stakeholder engagement and large-scale team coordination."
    ]
  }
];