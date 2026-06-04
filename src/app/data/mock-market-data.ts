export interface JobCategory {
  id: number;
  title: string;
  subtitle: string;
  accent: string;
}

export interface JobPosting {
  id: number;
  title: string;
  companyId: number;
  companyName: string;
  location: string;
  salary: string;
  contractType: string;
  category: string;
  summary: string;
}

export interface CompanyProfile {
  id: number;
  name: string;
  location: string;
  industry: string;
  openJobs: number;
  size: string;
  summary: string;
  highlights: string[];
  benefits: string[];
}

export interface CandidateProfile {
  id: number;
  name: string;
  title: string;
  location: string;
  experience: number;
  availability: string;
  summary: string;
  skills: string[];
  score: number;
}

export interface BlogPost {
  id: number;
  title: string;
  date: string;
  author: string;
  excerpt: string;
}

export const JOB_CATEGORIES: JobCategory[] = [
  { id: 1, title: 'Support technique', subtitle: 'Hotline, helpdesk, support client', accent: 'blue' },
  { id: 2, title: 'Developpement commercial', subtitle: 'Vente, croissance, partenariats', accent: 'violet' },
  { id: 3, title: 'Immobilier', subtitle: 'Gestion, biens, actifs', accent: 'green' },
  { id: 4, title: 'Analyse de marche', subtitle: 'Finance, reporting, insights', accent: 'amber' },
  { id: 5, title: 'Finance & banque', subtitle: 'Audit, finance, risque', accent: 'teal' },
  { id: 6, title: 'Informatique & reseau', subtitle: 'Cloud, infra, cybersecurite', accent: 'pink' },
  { id: 7, title: 'Restauration', subtitle: 'Operations, accueil, service', accent: 'orange' },
  { id: 8, title: 'Livraison a domicile', subtitle: 'Supply chain, logistique', accent: 'indigo' }
];

export const COMPANIES: CompanyProfile[] = [
  {
    id: 1,
    name: 'Winbrans',
    location: 'Tunis, Tunisie',
    industry: 'Design produit',
    openJobs: 4,
    size: '80-120 employes',
    summary: 'Studio digital specialise en design produit, experience utilisateur et innovation web.',
    highlights: ['UX/UI', 'Product Discovery', 'Prototype'],
    benefits: ['Remote partiel', 'Budget formation', 'Prime performance']
  },
  {
    id: 2,
    name: 'Infiniza',
    location: 'Sfax, Tunisie',
    industry: 'Ingenierie logicielle',
    openJobs: 6,
    size: '120-200 employes',
    summary: 'Entreprise tech orientee SaaS, backend distribue et plateformes a fort trafic.',
    highlights: ['Angular', 'Spring Boot', 'DevOps'],
    benefits: ['Assurance sante', 'Mentorat senior', 'Prime certification']
  },
  {
    id: 3,
    name: 'Glovibo',
    location: 'Sousse, Tunisie',
    industry: 'Marketing & croissance',
    openJobs: 3,
    size: '40-65 employes',
    summary: 'Agence de croissance digitale axee sur acquisition, branding et performance marketing.',
    highlights: ['SEO', 'Paid Media', 'Content'],
    benefits: ['Horaires flexibles', 'Bonus campagne', 'Offsites']
  },
  {
    id: 4,
    name: 'Bizotic',
    location: 'Nabeul, Tunisie',
    industry: 'Conseil',
    openJobs: 5,
    size: '65-90 employes',
    summary: 'Cabinet de conseil en transformation digitale pour retail, banque et industrie.',
    highlights: ['Consulting', 'Data', 'Transformation'],
    benefits: ['Plan de carrière', 'Coaching', 'Mobilité interne']
  }
];

export const JOBS: JobPosting[] = [
  {
    id: 1,
    title: 'Designer UI/UX',
    companyId: 1,
    companyName: 'Winbrans',
    location: 'Tunis',
    salary: '20k - 25k',
    contractType: 'Temps plein',
    category: 'Support technique',
    summary: 'Concevoir des interfaces modernes, systemes design et parcours utilisateur fluides.'
  },
  {
    id: 2,
    title: 'Developpeur Angular',
    companyId: 2,
    companyName: 'Infiniza',
    location: 'Sfax',
    salary: '24k - 32k',
    contractType: 'Temps plein',
    category: 'Informatique & reseau',
    summary: 'Developper des interfaces Angular robustes connectees a des APIs Spring Boot.'
  },
  {
    id: 3,
    title: 'Senior Manager',
    companyId: 4,
    companyName: 'Bizotic',
    location: 'Nabeul',
    salary: '28k - 35k',
    contractType: 'Stage',
    category: 'Developpement commercial',
    summary: 'Piloter l’equipe projet, le delivery client et la coordination metier/produit.'
  },
  {
    id: 4,
    title: 'Designer produit',
    companyId: 1,
    companyName: 'Winbrans',
    location: 'Tunis',
    salary: '18k - 24k',
    contractType: 'Temps partiel',
    category: 'Analyse de marche',
    summary: 'Structurer la discovery produit et creer des parcours centrés utilisateur.'
  },
  {
    id: 5,
    title: 'Responsable marketing digital',
    companyId: 3,
    companyName: 'Glovibo',
    location: 'Sousse',
    salary: '17k - 22k',
    contractType: 'Stage',
    category: 'Finance & banque',
    summary: 'Lancer des campagnes multicanales et analyser les performances acquisition.'
  },
  {
    id: 6,
    title: 'Specialiste SEO',
    companyId: 3,
    companyName: 'Glovibo',
    location: 'Remote',
    salary: '15k - 21k',
    contractType: 'Temps partiel',
    category: 'Developpement commercial',
    summary: 'Optimiser le référencement organique et améliorer la visibilité des marques.'
  }
];

export const CANDIDATES: CandidateProfile[] = [
  {
    id: 1,
    name: 'Jerry Hudson',
    title: 'Consultant business',
    location: 'Tunis',
    experience: 6,
    availability: 'Disponible sous 15 jours',
    summary: 'Consultant orienté structuration commerciale, excellence opérationnelle et growth.',
    skills: ['Business Strategy', 'CRM', 'Negotiation', 'Analytics'],
    score: 92
  },
  {
    id: 2,
    name: 'Jac Jackson',
    title: 'Consultant web',
    location: 'Sfax',
    experience: 4,
    availability: 'Disponible immédiatement',
    summary: 'Profil web transverse avec expertise front, CMS et optimisation parcours client.',
    skills: ['Angular', 'SEO', 'WordPress', 'UX'],
    score: 84
  },
  {
    id: 3,
    name: 'Tom Potter',
    title: 'Consultant UX/UI',
    location: 'Sousse',
    experience: 5,
    availability: 'Disponible sous 30 jours',
    summary: 'Designer produit focalisé sur la recherche utilisateur, prototypage et design systems.',
    skills: ['Figma', 'Design System', 'User Research', 'Wireframing'],
    score: 89
  },
  {
    id: 4,
    name: 'Shane Mac',
    title: 'Consultant SEO',
    location: 'Nabeul',
    experience: 3,
    availability: 'Freelance / mission',
    summary: 'Consultant SEO orienté acquisition organique, audit technique et contenu.',
    skills: ['SEO', 'Google Analytics', 'Content', 'Technical Audit'],
    score: 78
  }
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 1,
    title: 'Comment structurer un pipeline de recrutement moderne',
    date: '25 Mars 2026',
    author: 'Equipe Smart Recruit',
    excerpt: 'Mettez en place une vue claire des candidatures, des entretiens et du matching.'
  },
  {
    id: 2,
    title: 'Les 5 signaux d’un excellent profil produit',
    date: '18 Mars 2026',
    author: 'Equipe Design & Hiring',
    excerpt: 'Identifier rapidement les profils qui combinent vision produit et execution.'
  },
  {
    id: 3,
    title: 'Pourquoi l’ATS doit aussi servir les candidats',
    date: '12 Mars 2026',
    author: 'Equipe Candidate Experience',
    excerpt: 'Un bon recrutement optimise a la fois le suivi recruteur et l’experience candidat.'
  }
];
