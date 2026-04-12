import { Link } from 'react-router-dom'

const EXPERIENCE = [
  {
    id: 'cc',
    company: 'Constant Contact',
    role: 'Sales Analyst',
    period: 'July 2024 – Present',
    location: 'Boston, MA',
    bullets: [
      'Managed compensation reporting of 100+ sales reps and 2 business functions globally through Tableau dashboards',
      'Architected Systems Monitoring framework with a prioritized failure response list, reducing downtime by 15%',
      'Collaborated with a cross-functional team of 8 to ship 6 new features via agile sprint and backlog management',
    ],
  },
  {
    id: 'bs',
    company: 'BrowserStack',
    role: 'Sales Analyst',
    period: 'April 2020 – July 2022',
    location: 'Mumbai, IN',
    bullets: [
      'Led development of MQL model with behavior-based targeting, resulting in 40% higher sales conversion',
      'Formulated customer acquisition strategies through behavior analysis, resulting in $3.8M increased ARR',
      'Leveraged SQL, Looker, and BigQuery to analyze low-revenue accounts, increasing customer engagement by 23%',
      'Executed in-depth prospect analysis for B2B Salesforce SaaS CRM platform, improving lead generation by 50%',
    ],
  },
]

const PROJECTS = [
  {
    id: 'todo',
    lang: 'JavaScript',
    name: 'Todo App',
    desc: 'Full-stack task manager with auth, real-time sync, and CRUD operations.',
    tags: ['React', 'Supabase', 'Vite'],
    live: true,
    href: '/projects/todo',
  },
  {
    id: 'btc',
    lang: 'Python',
    name: 'BTC Prediction',
    desc: 'Machine learning model to predict Bitcoin price movements.',
    tags: ['Python', 'ML'],
    href: 'https://github.com/varunkapuria96/btcprediction',
  },
  {
    id: 'cnn',
    lang: 'Jupyter',
    name: 'CNN Image Classifier',
    desc: 'AlexNet architecture for image classification on the Oxford-IIIT Pet Dataset.',
    tags: ['Python', 'CNN', 'AlexNet'],
    href: 'https://github.com/varunkapuria96/image-data-classification-cnn-alexnet',
  },
  {
    id: 'attrition',
    lang: 'R',
    name: 'Employee Attrition',
    desc: 'Analysis of employee attrition costs and mitigation strategies.',
    tags: ['R', 'Analytics'],
    href: 'https://github.com/varunkapuria96/employeeatrittion',
  },
  {
    id: 'retail',
    lang: 'SQL / PHP',
    name: 'Retail Website + SQL',
    desc: 'Full-stack e-commerce site for Harbor Freight — 22-table Oracle schema, PHP frontend, hosted on EC2.',
    tags: ['Oracle SQL', 'PHP', 'EC2'],
    docs: true,
    href: '/projects/sql-website',
  },
  {
    id: 'etl',
    lang: 'HCL / Python',
    name: 'ETL Warehouse',
    desc: 'Northwind database ETL pipeline using SSIS and Visual Studio.',
    tags: ['SSIS', 'SQL', 'ETL'],
    href: 'https://github.com/varunkapuria96/ETL-Datawarehouse-SSIS-VisualStudio',
  },
]

function ProjectCard({ lang, name, desc, tags, live, docs, href }) {
  const className = `project-card${live ? ' live' : ''}${docs ? ' docs' : ''}`
  const isInternal = live || docs

  if (isInternal) {
    return (
      <Link to={href} className={className}>
        {live && <span className="live-badge">LIVE</span>}
        {docs && <span className="docs-badge">DOCS</span>}
        <div className="project-lang">{lang}</div>
        <div className="project-name">{name}</div>
        <div className="project-desc">{desc}</div>
        <div className="project-tags">
          {tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      </Link>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      <div className="project-lang">{lang}</div>
      <div className="project-name">{name}</div>
      <div className="project-desc">{desc}</div>
      <div className="project-tags">
        {tags.map(t => <span key={t} className="tag">{t}</span>)}
      </div>
    </a>
  )
}

export default function Portfolio() {
  return (
    <>
      <section className="hero">
        <p className="hero-tag">// hello world</p>
        <h1>
          Varun<br />
          Kapuria<span className="accent">.</span>
        </h1>
        <p className="hero-sub">
          Sales analyst turned builder. I use data to drive decisions at work —
          and build small experiments on the side to learn how things get made.
        </p>
        <div className="hero-links">
          <a href="#experiments" className="btn-primary">↓ projects</a>
          <a
            href="https://github.com/varunkapuria96"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
          <a
            href="https://www.linkedin.com/in/varunkapuria96"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn ↗
          </a>
        </div>
      </section>

      <div className="section-label">
        <span>// experience</span>
      </div>

      <section className="experience-list">
        {EXPERIENCE.map(exp => (
          <div key={exp.id} className="exp-item">
            <div className="exp-header">
              <div className="exp-left">
                <span className="exp-company">{exp.company}</span>
                <span className="exp-role">{exp.role}</span>
              </div>
              <div className="exp-right">
                <span className="exp-period">{exp.period}</span>
                <span className="exp-location">{exp.location}</span>
              </div>
            </div>
            <ul className="exp-bullets">
              {exp.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <div className="section-label">
        <span>// experiments</span>
      </div>

      <section id="experiments" className="projects-grid">
        {PROJECTS.map(p => (
          <ProjectCard key={p.id} {...p} />
        ))}
      </section>

      <footer className="portfolio-footer">
        <span>varun kapuria</span>
        <span>boston, ma · built with <span className="accent">react</span></span>
      </footer>
    </>
  )
}
