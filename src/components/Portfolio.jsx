import { Link } from 'react-router-dom'

const TIMELINE = [
  {
    id: 'cc',
    type: 'work',
    title: 'Constant Contact',
    sub: 'Sales Analyst',
    period: 'July 2024 – Present',
    location: 'Waltham, MA',
    bullets: [
      'Increased sales conversion rate by 30% YoY by reprioritizing call cadence using device type, engagement activity, and trial recency data',
      'Achieved 35% conversion rate in 2025 by optimizing call strategies via A/B testing of timing and frequency, identifying diminishing returns',
      'Saved 20+ hours monthly by automating compensation calculations for 70 sales reps through Type 2 SCD implementation in Salesforce',
      'Pioneered Sales Hub Tableau dashboard sliceable into 18 dimensions and 10 metrics — source of truth for MBR/QBR/WBR reviews',
      'Created a sales data AI chatbot using Snowflake\'s Streamlit, increasing data accessibility to executive leadership',
    ],
  },
  {
    id: 'ua',
    type: 'edu',
    title: 'University of Arizona, Eller College of Management',
    sub: 'MS Management Information Systems',
    period: '2023',
    location: 'Tucson, AZ',
  },
  {
    id: 'bs',
    type: 'work',
    title: 'BrowserStack',
    sub: 'Sales Analyst',
    period: 'April 2020 – July 2022',
    location: 'Mumbai, IN',
    bullets: [
      'Boosted lead-to-opportunity conversion by 5% by introducing two new AE-BDR collaboration processes in enterprise sales',
      'Led development of MQL model improving behavior-based targeting, resulting in 40% higher sales conversion through lead generation',
      'Improved customer retention by 0.5% by contributing to a predictive health score model identifying at-risk accounts',
      'Visualized and maintained 3 KPI dashboards on Tableau, facilitating visibility and data-driven decision making',
    ],
  },
  {
    id: 'nmims',
    type: 'edu',
    title: 'Narsee Monjee Institute of Management Studies',
    sub: 'MBA + BTech Information Technology (Dual Degree)',
    period: '2019',
    location: 'Mumbai, IN',
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
        <span>// timeline</span>
      </div>

      <section className="timeline">
        <div className="timeline-track">
          {TIMELINE.map(entry => (
            <div key={entry.id} className={`timeline-entry timeline-${entry.type}`}>
              <div className="timeline-dot" />
              <div className="timeline-meta">
                <span className="timeline-period">{entry.period}</span>
                <span className="timeline-location">{entry.location}</span>
              </div>
              <div className="timeline-title">{entry.title}</div>
              <div className="timeline-sub">{entry.sub}</div>
              {entry.bullets && (
                <ul className="timeline-bullets">
                  {entry.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
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
