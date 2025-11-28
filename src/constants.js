// ADDED 'Briefcase' TO THE IMPORT LIST BELOW
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
    coursework: "Intro to Programming Systems Design (CSCI455), Database Systems (CSCI585)",
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
    description: "A voice-controlled AI co-pilot assistant for X-Plane flight simulator.",
    longDescription: "Project Vimaan is a bridge between simulation and natural language. Using NLP and threading, it intercepts voice commands to control cockpit instruments in real-time within X-Plane, allowing for a hands-free flight experience.",
    images: [
      "/Xplane.jpg",
      "/Xplane.jpg"
    ],
    techStack: ["Python", "PyTorch", "Hugging Face Transformers", "DistilBERT", "Natural Language Processing", "Intent Classification", "Slot Extraction", "Speech Recognition", "Whisper ASR", "X-Plane SDK", "XPPython3", "Scikit-learn", "Matplotlib", "Seaborn", "NumPy", "Threading", "PyAudio", "Git"],
    links: { github: "#", demo: "#" }
  },
  {
    id: 2,
    title: "Brain Tumor Segmentation",
    category: "AI/ML",
    description: "End-to-end deep learning pipeline for automated brain tumor segmentation from MRI/CT scans.",
    longDescription: "Brain Tumor Segmentation leverages advanced CNN architectures and geometric deep learning to automatically identify and segment tumors from medical imaging data. The project processes millions of scans with depthwise separable CNNs for real-time inference and SO(3)-equivariant techniques for enhanced image clarity, supporting clinical workflows in diagnosis and treatment planning.",
    images: [
      "/BTS.png",
      "/BTS2.jpg"
    ],
    techStack: ["Python", "PyTorch", "TensorFlow", "Keras", "Convolutional Neural Networks (CNN)", "Depthwise Separable Convolutions", "SO(3)-Equivariant Networks", "Super-Resolution", "Medical Image Processing", "MRI/CT Image Analysis", "Data Augmentation", "Normalization Techniques", "Patch Extraction", "Data Balancing", "3D Segmentation", "Real-time Inference Optimization", "NumPy", "Pandas", "Scikit-learn", "OpenCV", "Matplotlib", "Seaborn", "Git"],
    links: { github: "#", demo: "#" }
  },
  {
    id: 3,
    title: "Numerical Investigation of Store Separation from a Rectangular Cavity",
    category: "CFD",
    description: "Computational study of weapons-bay store separation dynamics using CFD and statistical analysis.",
    longDescription: "This research investigates the complex aerodynamic phenomena governing store separation from a rectangular cavity (L/D=5) in weapons-bay environments. By combining transient CFD simulations with data-driven statistical methods, the project quantifies the relationship between aerodynamic coefficients and separation trajectories, providing critical insights into release behavior and flight-path predictability for aerospace applications.",
    images: [
      "/DRDO1.jpg",
      "/DRDO2.jpeg"
    ],
    techStack: ["Python", "MATLAB", "ANSYS Fluent", "PyFluent", "Computational Fluid Dynamics (CFD)", "Transient Simulations", "k-w SST Turbulence Model", "Linear Regression", "Statistical Analysis", "Aerodynamic Coefficient Analysis", "Lift and Drag Calculations", "Data Cleaning", "Z-score Outlier Detection", "Pressure Field Analysis", "Velocity Field Analysis", "3D Trajectory Animation", "Time-History Plotting", "Post-processing", "Numerical Methods", "Scikit-learn", "NumPy", "Pandas", "Matplotlib", "Git"],
    links: { 
      github: "#", 
      demo: "#"
    }
  },
  {
    id: 4,
    title: "Manzil Recipe Vault",
    category: "Web Dev",
    description: "A modern, minimalist recipe platform with Google OAuth and Drag-and-Drop.",
    longDescription: "Built a robust MERN stack application. Features include secure Google Authentication, a drag-and-drop meal planner, and dynamic grocery list generation based on selected recipes.",
    images: [
      "/ManzilVault.png"
    ],
    techStack: ["React", "Node.js", "MongoDB", "Express", "Google OAuth"],
    links: { github: "https://github.com/hasnainrazaa03/Manzil-Recipe-Vault", demo: "#" }
  },
  {
    id: 5,
    title: "Intelligent Expense Tracker",
    category: "Web Dev",
    description: "AI-powered expense management PWA for international students with multi-currency support and intelligent financial insights.",
    longDescription: "The Intelligent Expense Tracker is a comprehensive financial management platform designed for international students. It combines real-time expense tracking, AI-powered financial analysis using Google Gemini, multi-currency transactions (USD/INR), and specialized tools like tuition payment tracking. The application delivers actionable financial insights through interactive dashboards, budget monitoring, and predictive spending analysis—all within a responsive, offline-capable PWA.",
    images: [
      "/expense_dashboard.jpg"
    ],
    techStack: ["React 19", "React Hooks", "Tailwind CSS", "Recharts", "Google Gemini API", "Google GenAI SDK", "Progressive Web App (PWA)", "LocalStorage", "Frankfurter API", "Real-time Exchange Rates", "Multi-Currency Support", "Auto-Categorization", "Fuzzy Search", "Regex-based Suggestions", "CSV Import/Export", "PDF Report Generation", "Data Visualization", "Budget Tracking", "Financial Analytics", "Time Filtering", "Pivot Tables", "Dark Mode", "Responsive Design", "Authentication UI", "JavaScript", "Git"],
    links: { 
      github: "#", 
      demo: "#"
    }
  }

];

export const SKILLS = [
  { 
    category: "Languages", 
    icon: Terminal,
    items: [
      { name: "Python", level: "Expert", pct: 95, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" },
      { name: "C++", level: "Intermediate", pct: 75, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg" },
      { name: "MATLAB", level: "Expert", pct: 90, image: "https://upload.wikimedia.org/wikipedia/commons/2/21/Matlab_Logo.png" },
      { name: "Java", level: "Intermediate", pct: 70, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg" },
      { name: "JavaScript", level: "Intermediate", pct: 65, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" }
    ]
  },
  { 
    category: "AI & ML", 
    icon: Cpu,
    items: [
      { name: "PyTorch", level: "Expert", pct: 92, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg" },
      { name: "Computer Vision", level: "Expert", pct: 88, image: "https://cdn-icons-png.flaticon.com/512/2103/2103633.png" }, // Generic CV icon
      { name: "TensorFlow", level: "Intermediate", pct: 75, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg" },
      { name: "NLP", level: "Intermediate", pct: 70, image: "https://cdn-icons-png.flaticon.com/512/10435/10435171.png" }, // Generic NLP icon
      { name: "Scikit-learn", level: "Expert", pct: 85, image: "https://upload.wikimedia.org/wikipedia/commons/0/05/Scikit_learn_logo_small.svg" }
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
      { name: "REST APIs", level: "Expert", pct: 85, image: "https://cdn-icons-png.flaticon.com/512/8297/8297437.png" }
    ]
  },
  { 
    category: "Aerospace & Tools", 
    icon: Wind,
    items: [
      { name: "CFD Analysis", level: "Expert", pct: 95, image: "https://cdn-icons-png.flaticon.com/512/5405/5405929.png" },
      { name: "Simulink", level: "Expert", pct: 90, image: "https://upload.wikimedia.org/wikipedia/commons/8/87/Simulink_Logo.png" },
      { name: "SolidWorks", level: "Intermediate", pct: 70, image: "https://www.vectorlogo.zone/logos/solidworks/solidworks-icon.svg" },
      { name: "Git", level: "Expert", pct: 88, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg" },
      { name: "Linux", level: "Intermediate", pct: 75, image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg" }
    ]
  },
];

export const EXPERIENCE = [
  {
    id: 1,
    role: "Technology Consultant",
    company: "Deloitte",
    period: "Aug 2022 - Nov 2024",
    location: "Bengaluru, India",
    logo: "/Deloitte.png", 
    description: [
      "Automated customer creation and modification workflows in Pega PRPC, validating inputs, orchestrating approvals, and invoking downstream REST APIs for 7,500+ new and 12,500+ updates, achieving a 10x throughput increase.",
      "Measured automation impact by applying Welch two-sample t-test on processing-time samples before and after deployment, confirming the observed 44% latency reduction was statistically significant.",
      "Built 100+ ServiceNow business reports integrated into 3 interactive dashboards for dynamic performance and SLA monitoring.",
      "Designed and optimized LLM prompt templates (few-shot, chain-of-thought) and integrated RLHF feedback loops to enhance enterprise model response relevance."
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
      "Applied linear regression to correlate lift and drag coefficients with separation trajectories in weapons-bay store dynamics (L/D=5), identifying key predictors for release behavior.",
      "Automated transient CFD simulations in PyFluent and applied Z-score outlier detection to clean large pressure and velocity datasets before regression and trend analysis.",
      "Developed MATLAB scripts to post-process simulation outputs, generating 3D trajectory animations and time-history plots for quantitative flight-path assessment."
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
      "Built end-to-end ML pipelines to preprocess and augment 5M+ MRI/CT scans (normalization, patch extraction, data balancing) for training and evaluation.",
      "Implemented a depthwise separable CNN for real-time 3D segmentation (<0.8s inference), increasing diagnostic efficiency.",
      "Developed SO(3)-equivariant CNN-based super-resolution techniques, improving image clarity by ~35%."
    ] 
  },
];